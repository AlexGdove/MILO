# Calorie Tracker

Подсчёт калорий и учёт продуктов. Mobile-first PWA на React, в будущем — мобильное приложение.

## Структура

| Папка       | Назначение                                     |
| ----------- | ---------------------------------------------- |
| `frontend/` | React + Vite + TypeScript PWA, архитектура FSD |
| `backend/`  | Заготовка API                                  |
| `mobile/`   | Заготовка мобильного приложения                |

## Запуск

```bash
npm install
npm run dev        # дев-сервер фронтенда
npm run build      # продакшн-сборка (с service worker)
npm run preview    # просмотр сборки
npm run lint       # ESLint (включая проверку слоёв FSD)
npm run typecheck  # TypeScript
npm run format     # Prettier
```

## Архитектура фронтенда (Feature-Sliced Design)

`app → pages → widgets → features → entities → shared`

- Слой может импортировать только нижележащие слои.
- Слайсы одного слоя не импортируют друг друга.
- Импорт слайса — только через его public API (`index.ts`).

Правила контролируются ESLint (`eslint-plugin-boundaries`).

## Git-флоу

- `main` — стабильная ветка.
- **Каждое изменение — новая ветка** от `main`: `feat/…`, `fix/…`, `chore/…`, `refactor/…`, `docs/…`.
- Коммиты — [Conventional Commits](https://www.conventionalcommits.org/ru/).
- После проверки (`lint`, `typecheck`, `build`) ветка вливается в `main` через `--no-ff`.
