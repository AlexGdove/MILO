# MILO

Meal Intelligence & Lifestyle Organizer — питание, кладовая, рецепты и покупки в одном приложении. Mobile-first PWA на React, в будущем — мобильное приложение.

- Продукт и план развития: [docs/product.md](docs/product.md)
- Бренд и дизайн-система: [docs/brand.md](docs/brand.md)
- AI-скилы проекта: [docs/skills-inventory.md](docs/skills-inventory.md)
- Состояние и планы: [CURRENT_STATE](docs/CURRENT_STATE.md) · [TASKS](docs/TASKS.md) · [ROADMAP](docs/ROADMAP.md) · [DECISIONS](docs/DECISIONS.md)

## Структура

| Папка       | Назначение                                     |
| ----------- | ---------------------------------------------- |
| `frontend/` | React + Vite + TypeScript PWA, архитектура FSD |
| `backend/`  | API на NestJS (см. `backend/README.md`)        |
| `mobile/`   | Заготовка мобильного приложения                |

## Запуск

```bash
npm install
npm run db:up         # PostgreSQL и Redis в Docker (нужны бэкенду и его тестам)
npm run dev           # фронтенд и бэкенд вместе: [web] http://localhost:5173, [api] http://localhost:3000
npm run dev:frontend  # только фронтенд (Vite)
npm run dev:backend   # только бэкенд (Nest, перезапуск при изменениях)
npm run build         # продакшн-сборка фронтенда и бэкенда
npm run preview       # просмотр сборки фронтенда
npm test              # тесты: Vitest (frontend) и Jest (backend)
npm run lint          # ESLint (включая проверку слоёв FSD)
npm run typecheck     # TypeScript
npm run format        # Prettier
```

### Техподдержка локально

1. В `backend/.env` — `DEV_TOOLS=true` (служебные маршруты разработки; в production запрещены), затем `npm run dev`.
2. В приложении: «Профиль» → шестерёнка → «Техподдержка» → новое обращение. Фронтенд ходит на API через прокси Vite (`/api`, `/socket.io` → `localhost:3000`; другой адрес — `MILO_API_PROXY`).
3. Ответить «как оператор» (пока нет Telegram-бота): `npm run support:reply -w backend -- <номер обращения> "Текст"` — ответ сразу появится в открытой переписке.

## Архитектура фронтенда (Feature-Sliced Design)

`app → pages → widgets → features → entities → shared`

- Слой может импортировать только нижележащие слои.
- Слайсы одного слоя не импортируют друг друга.
- Импорт слайса — только через его public API (`index.ts`).

Правила контролируются ESLint (`eslint-plugin-boundaries`).

## Git-флоу

- `main` — стабильная ветка, напрямую не изменяется.
- `dev` — ветка разработки и интеграции.
- **Каждое изменение — новая ветка** от `dev`: `feat/…`, `fix/…`, `chore/…`, `refactor/…`, `docs/…`, `test/…`, `ci/…`.
- Коммиты — [Conventional Commits](https://www.conventionalcommits.org/ru/).
- После проверок (`lint`, `typecheck`, `test`, `build`) ветка вливается в `dev` через `--no-ff` — только с разрешения владельца.
- В `main` изменения попадают из `dev` только после зелёных проверок и CI и явного решения владельца.
