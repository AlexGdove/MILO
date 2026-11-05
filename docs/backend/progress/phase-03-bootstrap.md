# Этап 3. Приложение NestJS — отчёт

Дата: 2026-11-05. Ветка: `feat/backend-bootstrap` (от `dev` @ `454dd10`).

## 1. Что сделано

- `backend/` — npm workspace: NestJS 12.3 (Express), TypeScript ~5.9, ES-модули (B-12).
- Конфигурация: `@nestjs/config` + проверка ENV (`validateEnv`): `NODE_ENV`, `PORT`, `LOG_LEVEL`, `CORS_ORIGINS`, `SWAGGER_ENABLED`. При неверном значении процесс не стартует. В тестах `.env` не читается, логи выключены.
- Единый формат ошибок `{ error: { code, message, details?, requestId } }` — глобальный фильтр; неизвестные ошибки → 500 без подробностей (подробности — только в лог).
- Глобальный `ValidationPipe`: `whitelist` + `forbidNonWhitelisted` + `transform`; ошибки → `400 validation_failed` со списком «поле — сообщение» (вложенные пути `a.0.b`).
- Логирование: `nestjs-pino`, JSON; id запроса (`X-Request-Id` — от клиента, если безопасный, иначе UUID) присваивается первым middleware; ключ устройства, `authorization`, `cookie` скрыты; тела запросов не логируются; `/health` не логируется.
- HTTP: префикс `/api/v1`, JSON-тело ≤ 64 КБ, `helmet`, без `X-Powered-By`, CORS только для `CORS_ORIGINS` (заголовки `X-Device-Key`, `Idempotency-Key`), корректное завершение (shutdown hooks).
- Swagger: `/api/docs`, `/api/docs-json`, схема ключа устройства `device-key`; в production выключен по умолчанию.
- `GET /api/v1/health` → `{ status: 'ok' }`. `/health/ready` — на этапе 4 (нужна база).
- Монорепо: `backend` в `workspaces`; корневые `build`, `typecheck`, `test` — для обоих пакетов; `dev:backend`. ESLint подключён к `backend/`. CI — те же шаги (имя проверки не менялось, B-5), шаг тестов переименован в «Test (Vitest + Jest)».
- `CLAUDE.md`: правило тестов уточнено (frontend — Vitest, backend — Jest, B-3).

## 2. Зависимости (одобрены, B-11)

Runtime: `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express` 12.3.3, `@nestjs/config` 12.1.0, `@nestjs/swagger` 12.1.0, `class-validator` 0.15.1, `class-transformer` 0.5.1, `nestjs-pino` 5.3.1, `pino-http` 11.0.0, `helmet` 8.3.0; обязательные peer-зависимости: `pino` 10.4, `reflect-metadata` 0.2.2, `rxjs` 7.8.2.
Dev: `@nestjs/cli` 12.0.11, `@nestjs/testing` 12.3.3, `jest` 30.5.2, `ts-jest` 29.4.15, `supertest` 7.3.1, `typescript` ~5.9, `@types/*`.
Не ставились: `pino-pretty` (не в списке), `@nestjs/schematics` (генераторы не нужны).

## 3. Проверки

| Проверка                         | Результат                                                                                                                                                   |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ESLint (`npm run lint`)          | без ошибок                                                                                                                                                  |
| Prettier                         | без замечаний                                                                                                                                               |
| TypeScript (`npm run typecheck`) | frontend и backend — без ошибок                                                                                                                             |
| Тесты frontend (Vitest)          | 50 файлов, 316 тестов: 316 прошли, 0 упало, 0 пропущено                                                                                                     |
| Тесты backend (Jest)             | 4 набора (3 unit + 1 e2e), 38 тестов: 38 прошли, 0 упало, 0 пропущено                                                                                       |
| Build (`npm run build`)          | frontend и backend — успешно                                                                                                                                |
| Живой запуск `node dist/main.js` | `/api/v1/health` → 200 + `X-Request-Id`; неизвестный путь → 404 в едином формате; `PORT=abc` → процесс не стартует с понятной ошибкой                       |
| `npm audit --omit=dev`           | 0 уязвимостей в рабочих зависимостях                                                                                                                        |
| `npm audit` (все)                | 30 (2 low, 28 moderate), было 5 — в основном `minimatch` в dev-инструментах (`@nestjs/cli`, Jest, typescript-eslint). `npm audit fix --force` не запускался |
| CI                               | не запускался: ветка не отправлялась на GitHub                                                                                                              |

## 4. Найдено и исправлено в ходе этапа

1. **NestJS 12 — только ESM**: Jest в CommonJS-режиме не загружал `@nestjs/common` на Node 22. Решение B-12 — backend на ES-модулях, Jest в ESM-режиме.
2. **Нет id у запросов, отклонённых body-parser** (некорректный JSON, тело > 64 КБ): body-parser срабатывал раньше логгера, ответ содержал `requestId: "unknown"`. Найдено e2e-тестом; id теперь присваивает первый middleware; тесты проверяют id в обоих случаях.
3. Ветка для «сырых» ошибок body-parser в `toErrorBody` удалена: Nest 12 сам превращает их в `HttpException`. Некорректный JSON → `400 bad_request` (код `invalid_json` в контракте не значился).

## 5. Участие локальной модели

Ollama (`qwen2.5-coder:7b`) — черновики двух unit-тестов по готовой реализации (`env.validation.spec.ts`, `error-body.spec.ts`). Правки: нет импортов в первом файле, названия тестов не на русском, тест «пустые детали» не передавал `[]`, три `toEqual` без поля `message` (упали бы); после смены обработки body-parser тесты 5–6 заменены. Итог — по сути переписаны Claude Code с сохранением набора проверок. Код приложения, e2e-тесты, тесты `ValidationPipe`, настройка Jest/ESM, ESLint и CI — Claude Code.

## 6. Следующий этап

Этап 4 «PostgreSQL + Prisma» (`feat/backend-database`): Docker Compose (PostgreSQL 17), перенос `schema.draft.prisma`, начальная миграция (с `pg_trgm`, CHECK-ограничениями), `PrismaService`, ошибки БД → HTTP, `/health/ready`, интеграционные тесты на реальной БД. Перед стартом — проверить, что Docker Desktop запущен.
