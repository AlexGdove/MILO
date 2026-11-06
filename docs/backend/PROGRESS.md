# Прогресс backend MILO

Обновлено: 2026-11-06. План — `IMPLEMENTATION_PLAN.md`.

| #    | Этап                     | Статус                                                 | Отчёт                               |
| ---- | ------------------------ | ------------------------------------------------------ | ----------------------------------- |
| 1    | Аудит                    | DONE — закоммичен и влит в `dev` (2026-11-05)          | `progress/phase-01-audit.md`        |
| 2    | Архитектура и проект БД  | DONE — влит в `dev` (2026-11-05)                       | `progress/phase-02-architecture.md` |
| 3    | Приложение NestJS        | DONE — влит в `dev` и `main` (2026-11-05)              | `progress/phase-03-bootstrap.md`    |
| 4    | PostgreSQL + Prisma      | DONE — влит в `dev`, отправлен на GitHub (2026-11-05)  | `progress/phase-04-database.md`     |
| 5    | Ключ устройства и защита | DONE — влит в `dev`, CI зелёный (2026-11-06)           | `progress/phase-05-device-key.md`   |
| 6    | Общая база продуктов     | READY — в ветке `feat/backend-products`, не закоммичен | `progress/phase-06-products.md`     |
| 7–14 | …                        | не начаты (этап 10 «Email» удалён)                     | —                                   |

## С чего начать следующую сессию

1. Прочитать `CLAUDE.md`, этот файл, `BLOCKERS.md`, `DECISIONS.md`, `architecture.md`, `api.md`, `database.md`.
2. Проверить Ollama (`ollama_status`); если не запущена — сообщить владельцу и ждать.
3. Проверить Docker Desktop и `npm run db:up` (тесты backend требуют PostgreSQL и Redis).
4. CI на `dev` с PostgreSQL service — зелёный (run `42018818886`, 2026-11-05).
5. **B-18 (2026-11-06):** публичные рецепты заменены общей базой продуктов с автомодерацией (ADR-0005); поддержка — на этом сервере, ботов два. Этап 6 — ветка `feat/backend-products`, отчёт `progress/phase-06-products.md`; коммит и merge — по решению владельца.
6. Следующий — **этап 7** (frontend: «Найти в общей базе», «Предложить в общую базу») или **этап 8** (API поддержки) — порядок выбирает владелец. Для этапа 7 нужен `@tanstack/react-query` (одобрен, B-11); MSW не ставим, пока не понадобится (ответ владельца 2026-11-06).
7. Открытые вопросы: фото (`architecture.md` §9); В6 и T1 — `BLOCKERS.md`.
