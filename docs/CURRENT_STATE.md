# Текущее состояние MILO

Зафиксировано: 2026-11-05, конец второй рабочей сессии.

## С чего начать следующую сессию

Идёт **частичная переделка** по утверждённому плану (решения №22–25 в `DECISIONS.md`), четыре этапа, каждый в своей ветке от `dev`:

1. `feat/brand-mark-m` — знак «м» (этап 1) — **реализован, не закоммичен**, ждёт разрешения на коммит и merge.
2. `feat/pantry-in-stock` — кладовая только «в наличии», поиск → «в кладовую»/«в покупки» (этап 2) — следующий.
3. `feat/recipes` — раздел «Рецепты» вместо «Дневника», навигация Сегодня · Рецепты · Кладовая · Покупки (этап 3).
4. `feat/cook-recipe` — готовка, «Приготовленные» (порции), «История»; скриншоты вариантов 2 и 3 вкладок на выбор пользователю (этап 4).

Подробности этапов — `docs/ROADMAP.md`.

## Git

- Текущая ветка: `feat/brand-mark-m` (от `dev` @ `57b69a5`), изменения не закоммичены.
- `dev` → `57b69a5` (merge `feat/shopping-list`, шаг 7, с разрешения пользователя 2026-11-05). `main` → `dba56c8` (не менялся с введения правил).
- Удалённого репозитория нет, push не выполнялся, CI нет.
- Влитые рабочие ветки (не удалялись — удаление только с разрешения): `chore/monorepo-setup`, `chore/frontend-init`, `chore/eslint-setup`, `feat/pwa`, `feat/shared-ui`, `feat/products`, `feat/diary`, `feat/dashboard`, `chore/skills-setup` (в `main` до правил); `test/vitest-setup`, `docs/git-rules`, `docs/ai-delegation`, `docs/milo-foundation`, `chore/rename-milo`, `docs/session-context`, `feat/design-tokens`, `feat/brand-assets`, `feat/product-units`, `feat/shopping-list` (в `dev`).

## Что работает в приложении

PWA (офлайн, установка), мобильная вёрстка. Нижняя навигация: **Сегодня · Дневник · Кладовая · Покупки** (вкладка «Рецепты» добавится в шаге 8). Профиль — кнопка в верхнем ряду каждой страницы (справа).

- Кладовая (`/pantry`, `/products` → редирект): продукты с КБЖУ на 100 г/мл, единицы г/мл/шт (для шт — вес штуки), остаток, минимальный остаток; поиск, фильтр «В наличии»; бейджи «Закончился»/«Заканчивается» у отслеживаемых продуктов (`minStock > 0`) ниже минимума; кнопка-корзина «в покупки» на каждой карточке (✓ — уже в списке).
- **Покупки** (`/shopping`, шаг 7, в `dev`): позиции «Купить» / «Куплено» с чекбоксами, удаление позиции; «Перенести купленное в кладовую (N)» — прибавляет к остаткам и убирает перенесённое; блок «Заканчиваются в кладовой» — подсказки для отслеживаемых продуктов ниже минимума, которых нет в списке (добавляются только нажатием, без автодобавления). Количество по умолчанию — недостающее до минимума. Повторное добавление продукта суммирует количество. Позиции удалённых продуктов и со сменившейся единицей не переносятся и помечаются.
- Дневник: приёмы пищи по дням, КБЖУ, списание с остатка и возврат при удалении записи.
- Сводка дня (кольцо калорий, БЖУ), переключение дней, дневная цель, карточка установки.
- Айдентика MILO: знак «м» с мятной точкой (ветка `feat/brand-mark-m`; до неё — три столбика), логотип, палитра «Орбита», Onest/Unbounded, светлая и тёмная тема, иконки PWA; данные в `localStorage` под `milo:*` (миграция со старых ключей).

## Чего ещё нет (по плану)

Рецепты (шаг 8), готовка со списанием (шаг 9), e2e-смоук этапа B целиком. Этап C — по отдельным решениям пользователя.

## Структура фронтенда (FSD)

- `app`: layouts, providers (router, ErrorBoundary), styles
- `pages`: dashboard, diary, pantry, profile, shopping
- `widgets`: bottom-nav, daily-summary, meal-list, product-list, profile-link, shopping-list
- `features`: add-meal-entry, add-to-shopping-list, install-app, manage-product, remove-meal-entry, restock-from-shopping (`planRestock` — чистая функция), search-products, select-date, set-daily-goal
- `entities`: meal-entry (persist v2), product (persist v2; `getStockStatus`, `needsRestock`, `suggestPurchaseAmount`), shopping-item (persist v1, ключ `milo:shopping`, слияние по `productId`), user-goal (persist v1); миграции — `model/migrations.ts`
- `shared`: api (заготовка), config (routes), lib (cn, id, number, storage, date, nutrition, units), ui (Button, Card, EmptyState, Input, Logo, Modal, PageLayout, ProgressRing, SegmentedControl, Skeleton)

## Качество (последний прогон на `feat/brand-mark-m`, 2026-11-05)

| Проверка                         | Результат                                                                                                      |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Тесты (`npm test`, Vitest)       | 25 файлов, 190 тестов, все прошли, 0 пропущено (на `dev` после шага 7: 189)                                    |
| TypeScript (`npm run typecheck`) | без ошибок                                                                                                     |
| ESLint (`npm run lint`)          | без ошибок                                                                                                     |
| Build (`npm run build`)          | успешно                                                                                                        |
| Prettier                         | без замечаний                                                                                                  |
| E2E-смоук (вне репозитория)      | 360×780, светлая и тёмная тема: кладовая → покупки → перенос → перезагрузка; ошибок консоли и переполнения нет |
| CI                               | отсутствует                                                                                                    |

## Окружение

- Windows 10, Node 22.23, npm 10.9, Git 2.51; путь проекта `F:\Desktop\MILO`. Python в системе нет.
- Ollama (`qwen2.5-coder:7b`, MCP-сервер `ollama`): работает (0.40.14); 2026-11-05 утром была недоступна — шаг 7 сделан Claude Code целиком. В этапе 1 модель написала `favicon.svg` (с первой попытки, убрана только markdown-обёртка). Headless Edge не снимает скриншоты SVG-документов — проверять SVG через компонент в приложении.
- E2E: `playwright-core@1.48.2` + системный Edge (`C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`) из временной папки сессии; сервер — `npx vite preview --port N` из `frontend/` (аргументы через `npm run preview` не прокидываются).
- В Bash-инструменте heredoc с кириллицей в длинных командах может не разобраться — файлы создавать инструментом Write.

## AI-скилы

13 проектных скилов в `.claude/skills/`. Плагин Anthropic `example-skills` не установлен. Подробно — `docs/skills-inventory.md`.
