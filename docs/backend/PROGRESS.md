# Прогресс backend MILO

Обновлено: 2026-11-05. План — `IMPLEMENTATION_PLAN.md`.

| #    | Этап                    | Статус                                                | Отчёт                               |
| ---- | ----------------------- | ----------------------------------------------------- | ----------------------------------- |
| 1    | Аудит                   | DONE — закоммичен и влит в `dev` (2026-11-05)         | `progress/phase-01-audit.md`        |
| 2    | Архитектура и проект БД | DONE — влит в `dev` (2026-11-05)                      | `progress/phase-02-architecture.md` |
| 3    | Приложение NestJS       | DONE — влит в `dev` и `main` (2026-11-05)             | `progress/phase-03-bootstrap.md`    |
| 4    | PostgreSQL + Prisma     | DONE — влит в `dev`, отправлен на GitHub (2026-11-05) | `progress/phase-04-database.md`     |
| 5–14 | …                       | не начаты (этап 10 «Email» удалён)                    | —                                   |

## С чего начать следующую сессию

1. Прочитать `CLAUDE.md`, этот файл, `BLOCKERS.md`, `DECISIONS.md`, `architecture.md`, `api.md`, `database.md`.
2. Проверить Ollama (`ollama_status`); если не запущена — сообщить владельцу и ждать.
3. Проверить Docker Desktop и `npm run db:up` (тесты backend требуют PostgreSQL).
4. CI на `dev` с PostgreSQL service — зелёный (run `42018818886`, 2026-11-05).
5. Этап 5 «Ключ устройства и защита» — ветка `feat/backend-device-key` от `dev`. План этапа:
   - `POST /api/v1/device-keys` (ключ `mk_` + 32 байта base64url, в базе SHA-256), `DELETE /device-keys/me` (каскад), `DeviceKeyGuard` + декоратор текущего ключа, блокировка (`blocked_at` → 403 на запись);
   - лимиты `architecture.md` §5: Redis в `compose.yaml` (+ service в CI), `@nestjs/throttler` с хранилищем в Redis (пакет хранилища — уточнить по документации версии, он в одобренном списке «уточнить на этапе 5»), ключ лимита — IP или device key; `trust proxy` из ENV;
   - тесты: unit (хэш, формат ключа, guard), e2e на PostgreSQL (выдача, удаление с каскадом, 401/403, 429).
6. **B-15 (2026-11-05): поддержка — отдельный сервис `support/`** (свой VPS, база, ключ, бот; ADR-0004). На этапе 5 или 6 — миграция, удаляющая таблицы поддержки из схемы `backend/` (`support_tickets`, `support_messages`, `telegram_message_links.ticket_id`), с правкой тестов и `database.md`. Этап 8 — новый workspace `support/`.
7. Открытые вопросы, не блокирующие этапы 5–6: где каталог во frontend, шаги рецепта, фото (`architecture.md` §9); В6 и T1 — `BLOCKERS.md`.
