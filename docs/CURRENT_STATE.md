# Текущее состояние MILO

Зафиксировано: 2026-11-05, конец второй рабочей сессии.

## С чего начать следующую сессию

Идёт **частичная переделка** по утверждённому плану (решения №22–25 в `DECISIONS.md`), четыре этапа, каждый в своей ветке от `dev`:

1. `feat/brand-mark-m` — знак «м» (этап 1) — влит в `dev`.
2. `feat/pantry-in-stock` — кладовая только «в наличии», поиск → «в кладовую»/«в покупки» (этап 2) — влит в `dev`.
3. `feat/recipes` — раздел «Рецепты» вместо «Дневника», навигация Сегодня · Рецепты · Кладовая · Покупки (этап 3) — **реализован, не закоммичен**, ждёт решения пользователя (коммит/merge/пауза — спрашивать вариантами, см. память).
4. `feat/cook-recipe` — готовка со списанием, «Приготовленные» (порции), «История»; скриншоты вариантов 2 и 3 вкладок на выбор пользователю (этап 4) — следующий.

Подробности этапов — `docs/ROADMAP.md`. Отчёты пользователь просит в виде таблиц.

## Git

- Текущая ветка: `feat/recipes` (от `dev` @ `58023b2`), изменения не закоммичены.
- `dev` → `58023b2` (merge `feat/pantry-in-stock`; ранее `872520d` — `feat/brand-mark-m`, `57b69a5` — `feat/shopping-list`), всё с разрешения пользователя 2026-11-05. `main` → `dba56c8` (не менялся с введения правил).
- Удалённого репозитория нет, push не выполнялся, CI нет.
- Влитые рабочие ветки (не удалялись — удаление только с разрешения): `chore/monorepo-setup`, `chore/frontend-init`, `chore/eslint-setup`, `feat/pwa`, `feat/shared-ui`, `feat/products`, `feat/diary`, `feat/dashboard`, `chore/skills-setup` (в `main` до правил); `test/vitest-setup`, `docs/git-rules`, `docs/ai-delegation`, `docs/milo-foundation`, `chore/rename-milo`, `docs/session-context`, `feat/design-tokens`, `feat/brand-assets`, `feat/product-units`, `feat/shopping-list`, `feat/brand-mark-m`, `feat/pantry-in-stock` (в `dev`).

## Что работает в приложении

PWA (офлайн, установка), мобильная вёрстка. Нижняя навигация: **Сегодня · Рецепты · Кладовая · Покупки** (иконки: тарелка, кастрюля, банка, корзина). Профиль — кнопка в верхнем ряду страниц. `/diary` → `/`, `/products` → `/pantry`.

- **Сегодня** (`/`): сводка дня (кольцо калорий, БЖУ), переключение дней, приёмы пищи (бывший «Дневник»): записи по дням, списание с остатка и возврат при удалении.
- **Рецепты** (`/recipes`, ветка `feat/recipes`): вкладки «Рецепты» / «Приготовленные» / «История» (вкладка в адресе `?tab=`; две последние пока — пустые состояния до этапа 4). Список с поиском; карточка — порции, число ингредиентов, ккал на порцию, бейдж наличия («Всё есть» / «Не всего хватает» / «Нет продуктов»). Создание и правка рецепта: название, порции, ингредиенты — только продукты кладовой (выпадающий список), количество в единице продукта, без дублей.
- **Рецепт** (`/recipes/:id`): выбор порций (− / +, пересчёт количеств), по каждому ингредиенту — нужно / есть / не хватает и статус (Хватает / Частично / Нет), КБЖУ на порцию и всего; «Изменить» (с удалением).
- **Кладовая** (`/pantry`): только продукты в наличии («В наличии: N»). Поиск — по всем продуктам, сначала то, что есть дома; на карточке «+» (в кладовую), корзина (в покупки), ✎. Ничего не найдено → «Создать продукт» с названием из поиска. Единицы г/мл/шт, минимальный остаток, бейджи «Закончился»/«Заканчивается».
- **Покупки** (`/shopping`): «Купить» / «Куплено», перенос купленного в кладовую, подсказки «Заканчиваются в кладовой» (без автодобавления).
- Айдентика: знак «м» с мятной точкой, палитра «Орбита», Onest/Unbounded, светлая и тёмная тема; данные в `localStorage` под `milo:*`.

## Чего ещё нет (по плану)

Готовка со списанием, «Приготовленные» и «История» (этап 4), e2e-смоук этапа B целиком. Этап C — по отдельным решениям пользователя.

## Структура фронтенда (FSD)

- `app`: layouts, providers (router, ErrorBoundary; интеграционный тест раздела рецептов и навигации — `recipesFlow.test.tsx`), styles
- `pages`: dashboard, pantry, profile, recipe, recipes, shopping (`diary` удалена)
- `widgets`: bottom-nav, daily-summary, meal-list, product-list, profile-link, recipe-details, recipe-list, shopping-list
- `features`: add-meal-entry, add-to-shopping-list, install-app, manage-product, manage-recipe, remove-meal-entry, restock-from-shopping, search-products, select-date, set-daily-goal, stock-product
- `entities`: meal-entry (persist v2), product (persist v2), recipe (persist v1, `milo:recipes`; `checkAvailability`, `recipeNutrition`, `RecipeSource` + `localRecipeSource`; продукт описан структурным типом `IngredientProduct` — FSD запрещает импорт между сущностями), shopping-item (persist v1), user-goal (persist v1); миграции — `model/migrations.ts`
- `shared`: api (заготовка), config (routes, `recipePath`), lib (cn, id, number, storage, date, nutrition, units), ui (AmountForm, Button, Card, EmptyState, Input, Logo, Modal, PageLayout, ProgressRing, SegmentedControl, Skeleton)

## Качество (последний прогон на `feat/recipes`, 2026-11-05)

| Проверка                         | Результат                                                                                                                                                                                  |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Тесты (`npm test`, Vitest)       | 32 файла, 224 теста, все прошли, 0 пропущено (на `dev` после этапа 2: 199)                                                                                                                 |
| TypeScript (`npm run typecheck`) | без ошибок                                                                                                                                                                                 |
| ESLint (`npm run lint`)          | без ошибок                                                                                                                                                                                 |
| Build (`npm run build`)          | успешно                                                                                                                                                                                    |
| Prettier                         | без замечаний                                                                                                                                                                              |
| E2E-смоук (вне репозитория)      | 360×780, светлая и тёмная тема: кладовая → создать рецепт (3 ингредиента) → список → страница рецепта → порции → перезагрузка → вкладки; `/diary` → `/`; ошибок консоли и переполнения нет |
| CI                               | отсутствует                                                                                                                                                                                |

## Окружение

- Windows 10, Node 22.23, npm 10.9, Git 2.51; путь проекта `F:\Desktop\MILO`. Python в системе нет.
- Ollama (`qwen2.5-coder:7b`, MCP-сервер `ollama`): работает (0.40.14). Делала: `favicon.svg`; тесты `AddToPantryButton`; `RecipeCard`; тесты `checkAvailability` и миграций рецептов. Типичные огрехи: теряет пункты ТЗ (пропустила интерфейс пропсов), добавляет лишние проверки с неверными числами, забывает `?.` при `noUncheckedIndexedAccess` — всё проверять и прогонять. Headless Edge не снимает скриншоты SVG-документов.
- E2E: `playwright-core@1.48.2` + системный Edge (`C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`) из временной папки сессии; сервер — `npx vite preview --port N` из `frontend/` (аргументы через `npm run preview` не прокидываются).
- В Bash-инструменте heredoc с кириллицей в длинных командах может не разобраться — файлы создавать инструментом Write.

## AI-скилы

13 проектных скилов в `.claude/skills/`. Плагин Anthropic `example-skills` не установлен. Подробно — `docs/skills-inventory.md`.
