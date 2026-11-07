# Прогресс backend MILO

Обновлено: 2026-11-07. План — `IMPLEMENTATION_PLAN.md`.

| #     | Этап                      | Статус                                                                                                                                     | Отчёт                               |
| ----- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------- |
| 1     | Аудит                     | DONE — закоммичен и влит в `dev` (2026-11-05)                                                                                              | `progress/phase-01-audit.md`        |
| 2     | Архитектура и проект БД   | DONE — влит в `dev` (2026-11-05)                                                                                                           | `progress/phase-02-architecture.md` |
| 3     | Приложение NestJS         | DONE — влит в `dev` и `main` (2026-11-05)                                                                                                  | `progress/phase-03-bootstrap.md`    |
| 4     | PostgreSQL + Prisma       | DONE — влит в `dev`, отправлен на GitHub (2026-11-05)                                                                                      | `progress/phase-04-database.md`     |
| 5     | Ключ устройства и защита  | DONE — влит в `dev`, CI зелёный (2026-11-06)                                                                                               | `progress/phase-05-device-key.md`   |
| 6     | Общая база продуктов      | DONE — влит в `dev`, CI зелёный (2026-11-06)                                                                                               | `progress/phase-06-products.md`     |
| 7     | API + интеграция frontend | частично: ключ устройства, чат поддержки (№43), общая база и Open Food Facts в поиске (№53, №55); нет «Предложить в общую базу» и статусов | —                                   |
| 8     | Поддержка                 | DONE — влит в `dev` и `main` (2026-11-06)                                                                                                  | `progress/phase-08-support.md`      |
| 9     | Telegram (два бота)       | DONE — влит в `dev` (1.0.8), проверен на настоящих ботах (2026-11-07)                                                                      | `progress/phase-09-telegram.md`     |
| 10    | ~~Email~~                 | удалён (регистрации нет)                                                                                                                   | —                                   |
| 11    | Docker                    | READY — ветка `chore/docker` (1.0.10, B-22): образы backend и web (Caddy), `compose.prod.yaml`; проверено локально с `DOMAIN=localhost`    | `../deployment/README.md`           |
| 12–14 | …                         | не начаты                                                                                                                                  | —                                   |

## С чего начать следующую сессию

1. Прочитать `CLAUDE.md`, этот файл, `BLOCKERS.md`, `DECISIONS.md`, `architecture.md`, `api.md`, `database.md`.
2. Проверить Ollama (`ollama_status`); если не запущена — сообщить владельцу и ждать.
3. Проверить Docker Desktop и `npm run db:up` (тесты backend требуют PostgreSQL и Redis).
4. CI на `dev` с PostgreSQL service — зелёный (run `42018818886`, 2026-11-05).
5. Этапы 5, 6, 8 в `dev`; **этап 9 «Telegram»** — ветка `feat/backend-telegram` (B-21, отчёт `progress/phase-09-telegram.md`); сквозная проверка — после токенов ботов в `backend/.env`.
6. Порядок владельца (2026-11-07): этап 9 (два бота), пока готовится VPS → выгрузка на VPS (адрес API, CORS для `https://localhost` и `capacitor://localhost`).
7. Открытые вопросы: фото (`architecture.md` §9); В6 и T1 — `BLOCKERS.md`.
