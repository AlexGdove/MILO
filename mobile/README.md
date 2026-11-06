# MILO для Android (Capacitor)

Тот же фронтенд (`frontend/`) в нативной оболочке Capacitor 8 (решение №44): один код для веба (PWA) и приложения. iOS — позже (собирается только на macOS или в облаке).

## Как получить APK

**Прямая ссылка** (всегда последняя сборка, качается сразу): https://github.com/AlexGdove/MILO/releases/download/android-latest/milo.apk — она же на странице «Приложение».

**Файл запуска** — в GitHub Actions: Actions → «Android APK» → последний запуск (или «Run workflow») → Artifacts → `milo-debug-apk`. Это отладочная сборка: на телефоне нужно разрешить установку из этого источника.

Workflow `.github/workflows/android.yml` запускается при push в `dev` / `main` с изменениями во `frontend/` или `mobile/`.

## Локально

```bash
npm run build:mobile        # фронтенд в режиме mobile (без service worker) → cap sync android
npm run icons -w mobile     # иконки и экран запуска из знака MILO (после cap add / смены знака)
npm test -w mobile          # тесты генератора иконок (node:test)
```

Собрать APK на своей машине: Android Studio (с Android SDK) и JDK 21, затем `npm run open:android -w mobile` или `cd mobile/android && ./gradlew assembleDebug`.

## Устройство

| Что                                                                  | Где                                                                      |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Настройки Capacitor (`appId` `com.alexgdove.milo`, имя, `webDir`)    | `capacitor.config.ts`                                                    |
| Нативный проект Android (ведёт Capacitor, в git; ассеты сайта — нет) | `android/`                                                               |
| Кнопка «Назад» Android: закрыть диалог → шаг назад → выход           | `frontend/src/app/layouts/useNativeBackButton.ts`                        |
| Отступы под статус-бар и «чёлку» (Android 15+ edge-to-edge)          | `--safe-top` / `--safe-bottom` в `frontend/src/app/styles/variables.css` |
| Иконки (обычная, круглая, адаптивная) и экран запуска                | `scripts/generate-android-icons.mjs`                                     |

## Сервер

Приложение ходит на сервер по абсолютному адресу `VITE_API_URL` (в Actions — переменная репозитория `MILO_API_URL`). Пока сервер не развёрнут, поддержка в приложении показывает «недоступна», всё остальное работает на устройстве. При развёртывании в `CORS_ORIGINS` сервера нужно добавить `https://localhost` — адрес, с которого приложение Capacitor обращается к API на Android.

## Перед публикацией в Google Play

- `appId` после публикации не меняется — проверить сейчас.
- Подписанная релизная сборка (`assembleRelease` / AAB) с ключом в секретах репозитория.
- Политика конфиденциальности (вопрос В6, `docs/backend/BLOCKERS.md`).
