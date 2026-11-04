# Правила проекта

- Монорепо на npm workspaces: `frontend/` (React PWA), `backend/`, `mobile/` (пока заготовки).
- Фронтенд строго по FSD: `app → pages → widgets → features → entities → shared`, импорт слайсов только через `index.ts`, алиас `@/` = `frontend/src`.
- Стили — CSS Modules + CSS-переменные из `frontend/src/app/styles/variables.css`. Mobile-first.
- Данные пока хранятся локально (zustand persist) — доступ к хранилищу только через `shared/lib/storage`.
- **Каждое изменение делать в новой ветке** от `main` (`feat/`, `fix/`, `chore/`, `refactor/`, `docs/`), затем merge `--no-ff` в `main`.
- Перед merge: `npm run lint && npm run typecheck && npm run build` без ошибок.
- UI-тексты на русском.
