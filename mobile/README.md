# MILO для Android и iOS (Capacitor)

Тот же фронтенд (`frontend/`) в нативной оболочке Capacitor 8: один код для веба (PWA — устанавливается из браузера), Android (решение №44) и iOS (решение №47).

## Как получить APK

**Прямая ссылка** (всегда последняя сборка, качается сразу): https://github.com/AlexGdove/MILO/releases/download/android-latest/milo.apk — она же на странице «Приложение».

**Файл запуска** — в GitHub Actions: Actions → «Android APK» → последний запуск (или «Run workflow») → Artifacts → `milo-debug-apk`. Это отладочная сборка: на телефоне нужно разрешить установку из этого источника.

Workflow `.github/workflows/android.yml` запускается при push в `dev` / `main` с изменениями во `frontend/` или `mobile/`.

## Локально

```bash
npm run build:mobile        # фронтенд в режиме mobile (без service worker) → cap sync android
npm run icons -w mobile     # иконки и экраны запуска Android и iOS из знака MILO
npm test -w mobile          # тесты генератора иконок (node:test)
npm run build:web -w mobile && npm run sync:ios -w mobile   # веб-часть в iOS-проект
```

Собрать APK на своей машине: Android Studio (с Android SDK) и JDK 21, затем `npm run open:android -w mobile` или `cd mobile/android && ./gradlew assembleDebug`.

## Устройство

| Что                                                                  | Где                                                                      |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Настройки Capacitor (`appId` `com.alexgdove.milo`, имя, `webDir`)    | `capacitor.config.ts`                                                    |
| Нативный проект Android (ведёт Capacitor, в git; ассеты сайта — нет) | `android/`                                                               |
| Кнопка «Назад» Android: закрыть диалог → шаг назад → выход           | `frontend/src/app/layouts/useNativeBackButton.ts`                        |
| Отступы под статус-бар и «чёлку» (Android 15+ edge-to-edge)          | `--safe-top` / `--safe-bottom` в `frontend/src/app/styles/variables.css` |
| Иконки (обычная, круглая, адаптивная) и экран запуска                | `scripts/generate-native-icons.mjs`                                      |

## iOS

Проект — `ios/` (Swift Package Manager, CocoaPods не нужен). Собрать можно только на macOS: workflow «iOS build» (`.github/workflows/ios.yml`) собирает приложение без подписи для симулятора — артефакт `milo-ios-simulator`. На iPhone до публикации — через TestFlight, для этого нужен аккаунт Apple Developer ($99 в год): подпись и выкладка — отдельной задачей. До тех пор на iPhone — PWA: Safari → «Поделиться» → «На экран „Домой“». Иконка iOS — без прозрачности (требование App Store).

## Сервер

Приложение ходит на сервер по абсолютному адресу `VITE_API_URL` (в Actions — переменная репозитория `MILO_API_URL`). Пока сервер не развёрнут, поддержка в приложении показывает «недоступна», всё остальное работает на устройстве. При развёртывании в `CORS_ORIGINS` сервера нужно добавить `https://localhost` (Android) и `capacitor://localhost` (iOS) — адреса, с которых приложение Capacitor обращается к API (проверку `CORS_ORIGINS` сервера тогда расширить: сейчас она пропускает только http/https).

## Перед публикацией в Google Play

- `appId` после публикации не меняется — проверить сейчас.
- Подписанная релизная сборка (`assembleRelease` / AAB) с ключом в секретах репозитория.
- Политика конфиденциальности (вопрос В6, `docs/backend/BLOCKERS.md`).
