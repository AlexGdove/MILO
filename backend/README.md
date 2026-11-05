# Backend MILO

API для публичных рецептов и поддержки. Личные данные пользователя сервер не хранит — они остаются на устройстве (решения B-6…B-11). Документация: `docs/backend/` (архитектура, БД, API, план, прогресс).

## Стек

Node.js 22, TypeScript, NestJS 12 (ES-модули, решение B-12), Express, `@nestjs/config`, `nestjs-pino`, `@nestjs/swagger`, `class-validator`. Тесты — Jest + supertest (B-3). Дальше по плану: PostgreSQL + Prisma (этап 4), Redis, Socket.IO, Telegram (grammY).

## Запуск

```bash
cp backend/.env.example backend/.env   # при необходимости поправить
npm run dev:backend                    # из корня: nest start --watch, http://localhost:3000
```

- Проверка: `GET http://localhost:3000/api/v1/health` → `{ "status": "ok" }`.
- Swagger UI: http://localhost:3000/api/docs (JSON — `/api/docs-json`); в production выключен.

## Команды (из корня — для обоих пакетов, или `-w backend`)

| Команда                        | Что делает                                                   |
| ------------------------------ | ------------------------------------------------------------ |
| `npm run build -w backend`     | сборка в `backend/dist` (`nest build`)                       |
| `npm run start -w backend`     | запуск собранного (`node dist/main.js`)                      |
| `npm run typecheck -w backend` | проверка типов, включая тесты                                |
| `npm test -w backend`          | Jest: unit (`src/**/*.spec.ts`) и e2e (`test/*.e2e-spec.ts`) |

Jest работает в режиме ES-модулей (`--experimental-vm-modules`): NestJS 12 публикуется только как ESM, а Jest на Node 22 не загружает ESM через `require`.

## Устройство

| Путь                     | Назначение                                                                                                 |
| ------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `src/main.ts`            | запуск                                                                                                     |
| `src/app.setup.ts`       | HTTP-уровень (общий для запуска и e2e): id запроса, JSON ≤ 64 КБ, helmet, CORS, префикс `/api/v1`, Swagger |
| `src/app.module.ts`      | конфигурация с проверкой ENV, логирование, глобальные `ValidationPipe` и фильтр ошибок                     |
| `src/config/`            | проверка переменных окружения (`validateEnv`) и итоговые настройки                                         |
| `src/common/errors/`     | единый формат ошибок `{ error: { code, message, details?, requestId } }`                                   |
| `src/common/validation/` | `ValidationPipe`: лишние поля — ошибка, детали по полям                                                    |
| `src/common/logging/`    | pino: id запроса (`X-Request-Id`), без ключа устройства и тел запросов                                     |
| `src/health/`            | `GET /api/v1/health`                                                                                       |

Импорты внутри `src` пишутся с расширением `.js` (NodeNext).
