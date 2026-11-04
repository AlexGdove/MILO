# Текущее состояние MILO

Зафиксировано: 2026-11-04, конец первой рабочей сессии.

## Git

- Шаг 3 (`feat/design-tokens`) влит в `dev` с разрешения пользователя (2026-11-04); далее — шаг 4 (`feat/brand-assets`).
- `dev` — последний коммит: merge ветки `feat/design-tokens`; актуальный хэш — `git log -1 --oneline dev`. Ранее: `66af012` (шаги 0, 1, 2, тесты, правила Git и делегирования). Актуальный хэш: `git log -1 --oneline dev`.
- `main` → `dba56c8` (состояние до введения правил `main`/`dev`; с тех пор не менялся).
- Удалённого репозитория нет, push не выполнялся, CI нет.
- Рабочие ветки (все влиты, не удалялись — удаление только с разрешения): `chore/monorepo-setup`, `chore/frontend-init`, `chore/eslint-setup`, `feat/pwa`, `feat/shared-ui`, `feat/products`, `feat/diary`, `feat/dashboard`, `chore/skills-setup` (влиты в `main` до введения правил); `test/vitest-setup`, `docs/git-rules`, `docs/ai-delegation`, `docs/milo-foundation`, `chore/rename-milo`, `docs/session-context`, `feat/design-tokens` (влиты в `dev`).

## Что работает в приложении

PWA (офлайн, установка), мобильная вёрстка, нижняя навигация: Сегодня, Дневник, Продукты, Профиль.

- Справочник продуктов: 10 стартовых, добавление/редактирование/удаление, КБЖУ на 100 г, остаток **в граммах**, поиск, фильтр «В наличии».
- Дневник: приёмы пищи (завтрак/обед/ужин/перекус) по дням, расчёт КБЖУ, списание с остатка (не больше, чем есть; можно отключить), возврат при удалении записи.
- Сводка дня (кольцо калорий, полосы БЖУ), переключение дней, дневная цель, карточка установки приложения.
- Название — MILO (title, manifest, theme-color `#2F3BD9`); данные в `localStorage` под `milo:*` с переносом со старых ключей.

## Чего ещё нет (по плану)

- Иконки PWA и фавиконы MILO (шаг 4) — пока старые зелёные.
- Единицы мл/шт, минимальный остаток, кладовая, список покупок, рецепты, готовка.
- `favicon.ico` (браузер запрашивает его на не-HTML страницах — 404).

## Структура фронтенда (FSD)

- `app`: layouts, providers (router), styles
- `pages`: dashboard, diary, products, profile
- `widgets`: bottom-nav, daily-summary, meal-list, product-list
- `features`: add-meal-entry, install-app, manage-product, remove-meal-entry, search-products, select-date, set-daily-goal
- `entities`: meal-entry, product, user-goal (persist `version: 1`)
- `shared`: api (заготовка), config (routes), lib (cn, id, number, storage, date, nutrition), ui (Button, Card, EmptyState, Input, Logo, Modal, PageLayout, ProgressRing, Skeleton)

## Качество (последний прогон на `dev`, 2026-11-04)

| Проверка                         | Результат                                                                               |
| -------------------------------- | --------------------------------------------------------------------------------------- |
| Тесты (`npm test`, Vitest)       | 13 файлов, 104 теста, все прошли, 0 пропущено                                           |
| TypeScript (`npm run typecheck`) | без ошибок                                                                              |
| ESLint (`npm run lint`)          | без ошибок                                                                              |
| Build (`npm run build`)          | успешно                                                                                 |
| Prettier                         | без замечаний                                                                           |
| CI                               | отсутствует                                                                             |
| `npm audit`                      | 5 moderate только в dev-зависимостях (`workbox-build`, плагины ESLint); `--omit=dev`: 0 |

## Окружение

- Windows 10, Node 22.23, npm 10.9, Git 2.51; путь проекта `F:\Desktop\Новая папка` (кириллица и пробел — всегда в кавычках).
- Ollama 0.40.14 на `localhost:11434`, модель `qwen2.5-coder:7b`, MCP-сервер `ollama` проверен и работает (ответ ~25–125 с).
- E2E-проверки выполнялись `playwright-core` + системный Edge из временной папки сессии (не в репозитории).
- `npm run preview -- --port N` не прокидывает аргументы через workspace — использовать `npx vite preview --port N` из `frontend/`.

## AI-скилы

13 проектных скилов в `.claude/skills/`, видны Claude Code. Плагин Anthropic `example-skills` (`frontend-design`, `webapp-testing`) **не установлен**. Подробно — `docs/skills-inventory.md`.
