# Этап 4. PostgreSQL + Prisma — отчёт

Дата: 2026-11-05. Ветка: `feat/backend-database` (от `dev` @ `29259b6`).

## 1. Что сделано

- `compose.yaml` (корень): PostgreSQL 17 (alpine), healthcheck, том `milo-postgres`; при первом запуске создаётся вторая база `milo_test` (`docker/postgres/init`). Команды `npm run db:up` / `db:down`.
- Prisma 7.10.1: `backend/prisma/schema.prisma` (из черновика этапа 2), `prisma.config.ts` (URL из `.env` через встроенный `process.loadEnvFile`, без dotenv), генератор `prisma-client` в ESM (`backend/src/generated`, не в git; генерация при `npm install`).
- Миграции: `init` (12 таблиц, enum, индексы, GIN-индекс `gin_trgm_ops`; вручную — `pg_trgm` и 14 CHECK-ограничений) и `fix_piece_weight_check` (см. §4). Проверка расхождения схемы и миграций — пустая миграция.
- `PrismaService` (драйвер `@prisma/adapter-pg`, подключение при первом запросе), `PrismaModule` (глобальный).
- Ошибки базы → HTTP в общем фильтре: `P2002`/`P2003`/`P2034` → 409 `conflict`, `P2025` → 404 `not_found`, нет связи → 503 `service_unavailable`; прочие (в т. ч. нарушение CHECK) — 500 без подробностей.
- `GET /api/v1/health/ready` → 200 `{ status, checks: { database } }` или 503 `not_ready`.
- `DATABASE_URL` — обязательная переменная (только `postgres(ql)://`).
- Расчёт КБЖУ на порцию по снимку ингредиентов (`src/public-recipes/recipe-nutrition.ts`) — формулы клиента (`toGrams`, `recipeNutrition`).
- Seed: `npm run db:seed` — 3 демо-рецепта; повторный запуск ничего не меняет; в production не выполняется.
- Тесты на реальной PostgreSQL: Jest globalSetup проверяет имя базы (`*_test`), выставляет `DATABASE_URL` и применяет миграции `prisma migrate deploy` (B-13); каждый тест — с пустыми таблицами (`TRUNCATE`), файлы по очереди (`--runInBand`).
- CI: PostgreSQL 17 как service той же проверки (имя не менялось, B-5), `TEST_DATABASE_URL`.

## 2. Зависимости (одобрены, B-11)

`@prisma/client` 7.10.1, `@prisma/adapter-pg` 7.10.1 (тянет `pg`), dev: `prisma` 7.10.1. Тег `latest` у `prisma` — 8.0 RC, не используется (B-4).

## 3. Проверки

| Проверка                | Результат                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| ESLint, Prettier        | см. итоговый прогон в отчёте сессии                                                         |
| TypeScript              | frontend и backend — без ошибок                                                             |
| Тесты backend (Jest)    | 8 наборов, 74 теста: 74 прошли, 0 упало, 0 пропущено (из них 21 — e2e на PostgreSQL и HTTP) |
| Тесты frontend (Vitest) | без изменений кода; итоговый прогон — в отчёте сессии                                       |
| Миграции на базе `milo` | `migrate dev`: обе применены, схема синхронна                                               |
| Seed                    | 3 рецепта; повторный запуск — «skipped»; КБЖУ сверены вручную (каша: 688 ккал / 2 = 344)    |
| CI                      | не запускался: ветка не отправлена                                                          |

## 4. Найдено и исправлено

1. **CHECK веса штуки пропускал NULL.** Условие `(unit = 'pcs' AND piece_weight > 0 …) OR (unit <> 'pcs' AND piece_weight IS NULL)` при `pcs` и `NULL` даёт `NULL OR FALSE = NULL`, а CHECK пропускает NULL. Найдено интеграционным тестом; исправлено отдельной миграцией (`IS NOT NULL`), т. к. `init` уже применена.
2. **Prisma заблокировала `migrate reset --force` от ИИ-агента** (тестовая база `milo_test`). Команда не выполнялась; по решению владельца тесты готовят базу `migrate deploy` (B-13).
3. `globalSetup` Jest загружается Node напрямую (без ts-jest и `moduleNameMapper`) — переписан на обычный JS.
4. В ESM-режиме Jest нет глобального `jest.fn` — заглушки в тестах обычными объектами.
5. `database.md` приведён к реализации: uuid генерирует клиент Prisma; триграммный индекс по `name` (`ILIKE`), а не по `lower(name)`; индекс outbox обычный, не частичный (Prisma не описывает частичные и выражения — иначе вечное расхождение).

## 5. Участие локальной модели

Ollama (`qwen2.5-coder:7b`): `recipe-nutrition.ts` — с первого раза корректно (Claude Code добавил комментарии, о которых модель забыла); тесты к нему — расчёты верные, но названия на английском и тест «округление только в конце» ничего не проверял (3.33 при любом способе) — заменён на случай, где пошаговое округление даёт 0. Остальное (инфраструктура, Prisma, миграции, ошибки, health, seed, интеграционные тесты, CI) — Claude Code.

## 6. Следующий этап

Этап 5 «Ключ устройства и защита» (`feat/backend-device-key`): выдача ключа, guard, лимиты (Redis в `compose.yaml`, `@nestjs/throttler`), `trust proxy` для IP за прокси.
