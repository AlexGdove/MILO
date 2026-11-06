# Backend MILO

API общей базы продуктов (предложения с автомодерацией, B-18) и анонимной поддержки; один ключ устройства. Личные данные пользователя сервер не хранит — они остаются на устройстве (решения B-6…B-11). Документация: `docs/backend/` (архитектура, БД, API, план, прогресс).

## Стек

Node.js 22, TypeScript, NestJS 12 (ES-модули, решение B-12), Express, `@nestjs/config`, `nestjs-pino`, `@nestjs/swagger`, `class-validator`; PostgreSQL 17 + Prisma 7 (`@prisma/adapter-pg`); Redis 8 (`ioredis`) — счётчики лимитов. Тесты — Jest + supertest (B-3). Дальше по плану: Telegram (grammY).

## Запуск

Нужен Docker Desktop (PostgreSQL и Redis в контейнерах).

```bash
npm install                              # заодно генерирует клиент Prisma (backend/src/generated)
cp backend/.env.example backend/.env     # при необходимости поправить
npm run db:up                            # PostgreSQL 17 (базы milo, milo_test) и Redis 8 (compose.yaml)
npm run db:migrate                       # применить миграции к milo (prisma migrate dev)
npm run db:seed                          # необязательно: 6 демо-продуктов общей базы
npm run dev:backend                      # nest start --watch, http://localhost:3000
```

- Живость: `GET /api/v1/health` → `{ "status": "ok" }`; готовность (база и Redis доступны): `GET /api/v1/health/ready`.
- Swagger UI: http://localhost:3000/api/docs (JSON — `/api/docs-json`); в production выключен.
- WebSocket поддержки: Socket.IO, путь `/socket.io`, пространство `/support`, `auth: { deviceKey }`.
- Ответ в обращение «как оператор» без Telegram-бота: `DEV_TOOLS=true` в `.env`, затем `npm run support:reply -w backend -- <номер> "Текст"` (служебный маршрут `POST /api/v1/dev/support/tickets/:number/reply`; выключен — 404; в production `DEV_TOOLS=true` не даёт серверу стартовать).
- Остановить: `npm run db:down` (данные базы остаются в томе `milo-postgres`; счётчики Redis не сохраняются).
- Ключ устройства: `POST /api/v1/device-keys` → `{ key }`; дальше заголовок `X-Device-Key`. Удалить всё своё: `DELETE /api/v1/device-keys/me`.

## Команды (из корня — для обоих пакетов, или `-w backend`)

| Команда                          | Что делает                                                                    |
| -------------------------------- | ----------------------------------------------------------------------------- |
| `npm run build -w backend`       | сборка в `backend/dist` (`nest build`)                                        |
| `npm run start -w backend`       | запуск собранного (`node dist/main.js`)                                       |
| `npm run typecheck -w backend`   | проверка типов, включая тесты                                                 |
| `npm test -w backend`            | Jest: unit (`src/**/*.spec.ts`) и e2e на реальной базе (`test/*.e2e-spec.ts`) |
| `npm run db:generate -w backend` | заново сгенерировать клиент Prisma после правки схемы                         |
| `npm run db:migrate -w backend`  | новая миграция по изменениям `prisma/schema.prisma` и применение к `milo`     |
| `npm run db:deploy -w backend`   | применить готовые миграции без создания новых (как на сервере)                |

### Тесты и база

- e2e-тесты работают с базой **`milo_test`** (или `TEST_DATABASE_URL`) и отказываются запускаться на базе, имя которой не оканчивается на `_test`: перед каждым тестом таблицы очищаются (`TRUNCATE`).
- Redis для тестов — база **1** (`TEST_REDIS_URL`, по умолчанию `redis://localhost:6379/1`); перед тестами лимитов она очищается (`FLUSHDB`), база 0 запрещена.
- Перед тестами применяются новые миграции — `prisma migrate deploy`; база не пересоздаётся (решение B-13). Если миграцию правили задним числом, тестовую базу нужно пересоздать вручную.
- В CI PostgreSQL и Redis поднимаются как services той же проверки `lint · typecheck · test · build`.

Jest работает в режиме ES-модулей (`--experimental-vm-modules`): NestJS 12 публикуется только как ESM, а Jest на Node 22 не загружает ESM через `require`. Глобальный `jest.fn` в этом режиме недоступен — заглушки пишутся обычными объектами.

## Устройство

| Путь                       | Назначение                                                                                                                        |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `src/main.ts`              | запуск                                                                                                                            |
| `src/app.setup.ts`         | HTTP-уровень (общий для запуска и e2e): id запроса, JSON ≤ 64 КБ, helmet, CORS, префикс `/api/v1`, Swagger                        |
| `src/app.module.ts`        | конфигурация с проверкой ENV, логирование, база, глобальные `ValidationPipe` и фильтр ошибок                                      |
| `src/config/`              | проверка переменных окружения (`validateEnv`) и итоговые настройки                                                                |
| `src/common/errors/`       | единый формат ошибок `{ error: { code, message, details?, requestId } }`                                                          |
| `src/common/validation/`   | `ValidationPipe`: лишние поля — ошибка, детали по полям                                                                           |
| `src/common/logging/`      | pino: id запроса (`X-Request-Id`), без ключа устройства и тел запросов                                                            |
| `src/prisma/`              | `PrismaService`, ошибки базы → HTTP (`P2002`/`P2003` → 409, `P2025` → 404, нет связи → 503), seed                                 |
| `src/health/`              | `GET /api/v1/health`, `GET /api/v1/health/ready` (база и Redis); без общего лимита                                                |
| `src/redis/`               | `RedisService` (ioredis): фоновое подключение, ответ или ошибка за 1 с                                                            |
| `src/modules/device-keys/` | ключ устройства (ADR-0001): выдача, `DeviceKeyGuard` + `@CurrentDeviceKey()`, блокировка, удаление                                |
| `src/modules/products/`    | общая база (поиск по названию / бренду / штрихкоду, курсор), предложения и автомодерация `automod.ts` (ADR-0005), outbox для бота |
| `src/modules/moderation/`  | решения оператора по `pending`: принять / отклонить, (раз)блокировать ключ — для бота модерации (этап 9)                          |
| `src/common/idempotency/`  | `Idempotency-Key`: повтор POST → тот же ответ, другой запрос → 422                                                                |
| `src/common/pagination/`   | курсор (время + id, base64url), `PageQueryDto`, `cursorPage`                                                                      |
| `src/common/websocket/`    | `MiloIoAdapter`: Socket.IO с CORS из `CORS_ORIGINS`, сообщения ≤ 64 КБ                                                            |
| `src/modules/rate-limit/`  | лимиты (`architecture.md` §5): глобальный guard, `@RateLimit(name)`, скользящее окно в Redis (B-16)                               |
| `src/modules/support/`     | поддержка (B-19): REST `/support/tickets`, Socket.IO `/support` (доставка событий), ответ оператора для бота (этап 9)             |
| `src/modules/dev-tools/`   | служебные маршруты разработки (`DEV_TOOLS`, `DevToolsGuard`): ответ «как оператор»                                                |
| `prisma/`                  | схема и миграции (CHECK-ограничения и `pg_trgm` — SQL в миграциях)                                                                |
| `test/`                    | e2e: HTTP-уровень, интеграция с PostgreSQL и Redis, ключ устройства и лимиты                                                      |

Импорты внутри `src` пишутся с расширением `.js` (NodeNext).
