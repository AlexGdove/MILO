# Инвентаризация AI-скилов MILO

Проверено: 2026-11-04. Проектные скилы лежат в `.claude/skills/`. После перезапуска сессии все 13 проектных скилов видны Claude Code (проверено по списку доступных скилов). Плагин Anthropic `example-skills` (frontend-design, webapp-testing) в списке не появился — не установлен.

## Где искали

| Место                                                                   | Результат                                                                                                                      |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `C:\Cloud`                                                              | Не существует (проверены корень `C:\` и `C:\Users\fumck` до глубины 6)                                                         |
| `C:\Users\fumck\.claude\claude-project-skills\.claude\skills\`          | 6 скилов; лежали вне путей поиска Claude Code, поэтому были неактивны. Скопированы в проект, оригиналы не изменялись           |
| `C:\Users\fumck\.claude\skills\synced\`                                 | Встроенные скилы Claude (docx, pdf, skill-creator и др.) — не по задачам проекта, кроме `skill-creator`                        |
| `~/.codex/skills`, `~/.cursor/skills-cursor`, `~/.vscode/agent-plugins` | Скилы других инструментов (Codex, Cursor, Copilot) — не применимы к Claude Code                                                |
| github.com/anthropics/skills (Apache 2.0)                               | Официальные: `frontend-design`, `webapp-testing` подходят MILO. Zustand, TanStack, NestJS, Jest/RTL, Git, GitHub Actions — нет |

## Сводная таблица

| Категория       | Технология                 | Статус                            | Скил                                    | Расположение                                                                                                       |
| --------------- | -------------------------- | --------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Frontend        | React                      | Активирован (общий)               | `react-typescript`                      | `.claude/skills/react-typescript` (копия из claude-project-skills)                                                 |
| Frontend        | TypeScript                 | Активирован (общий)               | `react-typescript`                      | то же                                                                                                              |
| Frontend        | Дизайн UI / дизайн-системы | Не установлен (проверено)         | `frontend-design`                       | плагин `example-skills@anthropic-agent-skills`                                                                     |
| Архитектура     | Монорепо, FSD              | Активирован                       | `project-architecture`                  | `.claude/skills/project-architecture` (копия)                                                                      |
| State           | Zustand                    | Создан                            | `zustand-state`                         | `.claude/skills/zustand-state`                                                                                     |
| Server state    | TanStack Query             | Создан, библиотека не установлена | `tanstack-query`                        | `.claude/skills/tanstack-query`                                                                                    |
| Virtualization  | TanStack Virtual           | Создан, библиотека не установлена | `tanstack-virtual`                      | `.claude/skills/tanstack-virtual`                                                                                  |
| Backend         | Node.js                    | Активирован (общий)               | `backend-engineering`                   | `.claude/skills/backend-engineering` (копия)                                                                       |
| Backend         | NestJS                     | Создан, стек бэкенда не утверждён | `nestjs-backend`                        | `.claude/skills/nestjs-backend`                                                                                    |
| Testing         | Jest-совместимый (Vitest)  | Создан + общий                    | `testing-vitest-rtl`, `testing-quality` | `.claude/skills/…`                                                                                                 |
| Testing         | React Testing Library      | Создан                            | `testing-vitest-rtl`                    | `.claude/skills/testing-vitest-rtl`                                                                                |
| Testing         | E2E (Playwright)           | Не установлен (проверено)         | `webapp-testing`                        | плагин `example-skills@anthropic-agent-skills`                                                                     |
| Review          | Code review                | Активирован                       | `milo-code-review`                      | `.claude/skills/milo-code-review` (копия `code-review`, переименована из-за конфликта со встроенным `code-review`) |
| Mobile          | Мобильное приложение       | Активирован (общий)               | `mobile-engineering`                    | `.claude/skills/mobile-engineering` (копия)                                                                        |
| Version control | Git / GitHub               | Создан                            | `git-github-workflow`                   | `.claude/skills/git-github-workflow`                                                                               |
| CI/CD           | GitHub Actions             | Создан                            | `github-actions-ci`                     | `.claude/skills/github-actions-ci`                                                                                 |

## Как создавались новые скилы

7 скилов (`zustand-state`, `tanstack-query`, `tanstack-virtual`, `nestjs-backend`, `testing-vitest-rtl`, `git-github-workflow`, `github-actions-ci`) созданы через `skill-creator` по официальной документации (ссылки и дата чтения — в разделе «Sources» каждого скила). Факты, которые не удалось подтвердить по прочитанным страницам, помечены в тексте как неподтверждённые.

- Zustand: страницы документации вернули 404, поэтому API persist и `useShallow` сверены по типам установленного пакета `zustand@5.0.16`.
- Формат frontmatter проверен по правилам `skill-creator/scripts/quick_validate.py` (сам скрипт не запускался: ему нужен PyYAML, которого нет в системе).
- Полный eval-цикл `skill-creator` (тестовые прогоны с базовой линией и без неё) **не выполнялся**. Качество срабатывания скилов будет видно в работе; при проблемах — прогнать eval-цикл.

## Ограничения скилов

Скилы дают знания и порядок работы. Они не разрешают менять стек, ставить зависимости или выполнять разрушительные операции. TanStack Query, TanStack Virtual и NestJS в проект не добавлены — для этого нужно отдельное решение.

## Что сделать пользователю

1. В Claude Code: `/plugin marketplace add anthropics/skills`, затем `/plugin install example-skills@anthropic-agent-skills`.
2. Перезапустить сессию в корне репозитория, чтобы подхватились `.claude/skills/*` и плагины.
