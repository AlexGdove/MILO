# Прогресс backend MILO

Обновлено: 2026-11-05. План — `IMPLEMENTATION_PLAN.md`.

| #    | Этап                    | Статус                                                        | Отчёт                               |
| ---- | ----------------------- | ------------------------------------------------------------- | ----------------------------------- |
| 1    | Аудит                   | DONE — закоммичен и влит в `dev` (2026-11-05)                 | `progress/phase-01-audit.md`        |
| 2    | Архитектура и проект БД | DONE — влит в `dev` (2026-11-05)                              | `progress/phase-02-architecture.md` |
| 3    | Приложение NestJS       | DONE — влит в `dev` и `main` (2026-11-05)                     | `progress/phase-03-bootstrap.md`    |
| 4    | PostgreSQL + Prisma     | DONE (ждёт решения о коммите) — ветка `feat/backend-database` | `progress/phase-04-database.md`     |
| 5–14 | …                       | не начаты (этап 10 «Email» удалён)                            | —                                   |

## С чего начать следующую сессию

1. Прочитать `CLAUDE.md`, этот файл, `BLOCKERS.md`, `DECISIONS.md`, `architecture.md`, `api.md`, `database.md`.
2. Проверить Ollama (`ollama_status`); если не запущена — сообщить владельцу и ждать.
3. Проверить Docker Desktop и `npm run db:up` (тесты backend требуют PostgreSQL).
4. Этап 5 «Ключ устройства и защита» — ветка `feat/backend-device-key` от `dev` (после коммита и merge этапа 4).
