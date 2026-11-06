# MILO для Android и iOS (Capacitor)

Тот же фронтенд (`frontend/`) в нативной оболочке Capacitor 8: один код для веба (PWA — устанавливается из браузера), Android (решение №44) и iOS (решение №47).

## Как получить APK

**Прямая ссылка** (всегда последняя сборка, качается сразу): https://github.com/AlexGdove/MILO/releases/download/android-latest/milo.apk — она же на странице «Приложение».

**Файл запуска** — в GitHub Actions: Actions → «Android APK» → последний запуск (или «Run workflow») → Artifacts → `milo-apk`. На телефоне нужно разрешить установку из этого источника.

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

| Что                                                                                     | Где                                                                      |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Настройки Capacitor (`appId` `com.alexgdove.milo`, имя, `webDir`)                       | `capacitor.config.ts`                                                    |
| Нативный проект Android (ведёт Capacitor, в git; ассеты сайта — нет)                    | `android/`                                                               |
| Кнопка «Назад» Android: закрыть диалог → шаг назад → выход                              | `frontend/src/app/layouts/useNativeBackButton.ts`                        |
| Отступы под статус-бар и «чёлку» (Android 15+ edge-to-edge)                             | `--safe-top` / `--safe-bottom` в `frontend/src/app/styles/variables.css` |
| Иконки (обычная, круглая, адаптивная) и экран запуска                                   | `scripts/generate-native-icons.mjs`                                      |
| `fetch` через нативный HTTP (`CapacitorHttp`): Open Food Facts напрямую, без CORS (№53) | `capacitor.config.ts` → `plugins`                                        |

## Ключ подписи Android (решение №52)

Без постоянного ключа каждая сборка из CI подписана случайным отладочным ключом — новая версия **не ставится поверх старой** (Android откажет: подписи разные). Ключ создаёт владелец один раз; пароли знает только он.

1. Создать ключ (PowerShell; `keytool` входит в Java — на этой машине он не в PATH, поэтому полный путь):

   ```powershell
   & "C:\Program Files\Java\jre1.8.0_431\bin\keytool.exe" -genkeypair -v -storetype PKCS12 -keystore milo-release.jks -alias milo -keyalg RSA -keysize 4096 -validity 10000
   ```

   Задать пароль (запомнить!), имя и организацию можно любые.

2. Перевести файл в текст для секрета:

   ```powershell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("milo-release.jks")) | Set-Clipboard
   ```

3. GitHub → репозиторий → Settings → Secrets and variables → Actions → New repository secret, четыре секрета:

   | Секрет                      | Значение                           |
   | --------------------------- | ---------------------------------- |
   | `ANDROID_KEYSTORE_BASE64`   | вставить из буфера (шаг 2)         |
   | `ANDROID_KEYSTORE_PASSWORD` | пароль из шага 1                   |
   | `ANDROID_KEY_ALIAS`         | `milo`                             |
   | `ANDROID_KEY_PASSWORD`      | тот же пароль (для PKCS12 он один) |

4. **Резервная копия** `milo-release.jks` и пароля — в надёжное место вне компьютера (менеджер паролей, флешка). Потеряли ключ — приложение больше не обновить, только выпускать новое. В git файл не попадёт (`*.jks` в `.gitignore`).
5. Запустить workflow «Android APK» (Actions → Run workflow). В логе шага «Show signing certificate» — отпечаток сертификата; он должен быть одинаковым у всех следующих сборок.
6. **Один раз** удалить с телефона прежний APK (он подписан другим ключом) и поставить новый. Дальше версии ставятся поверх, данные сохраняются.

Пока секретов нет, сборка не падает: в Actions предупреждение, APK подписан отладочным ключом, как раньше.

## iOS

Проект — `ios/` (Swift Package Manager, CocoaPods не нужен). Собрать можно только на macOS: workflow «iOS build» (`.github/workflows/ios.yml`) собирает приложение без подписи для симулятора — артефакт `milo-ios-simulator`. На iPhone до публикации — через TestFlight, для этого нужен аккаунт Apple Developer ($99 в год): подпись и выкладка — отдельной задачей. До тех пор на iPhone — PWA: Safari → «Поделиться» → «На экран „Домой“». Иконка iOS — без прозрачности (требование App Store).

### Что нужно для iPhone (TestFlight / App Store)

1. Аккаунт Apple Developer Program ($99 в год) на владельца.
2. В App Store Connect — приложение с Bundle ID `com.alexgdove.milo`.
3. Подпись: сертификат «Apple Distribution» и профиль (provisioning profile) — их выдаёт Apple, ключом-файлом, как у Android, не обойтись. Для CI — ключ App Store Connect API (секреты репозитория).
4. Workflow собирает подписанный архив и выкладывает в TestFlight; оттуда — на iPhone тестировщиков или в App Store после проверки Apple.

## Сервер

Приложение ходит на сервер по абсолютному адресу `VITE_API_URL` (в Actions — переменная репозитория `MILO_API_URL`). Пока сервер не развёрнут, поддержка в приложении показывает «недоступна», всё остальное работает на устройстве. При развёртывании в `CORS_ORIGINS` сервера нужно добавить `https://localhost` (Android) и `capacitor://localhost` (iOS) — адреса, с которых приложение Capacitor обращается к API (проверку `CORS_ORIGINS` сервера тогда расширить: сейчас она пропускает только http/https). HTTP-запросы приложения идут через нативный `CapacitorHttp` и CORS не проверяют, но Socket.IO (WebSocket) проверяет `Origin` — для чата поддержки эти адреса нужны.

## Перед публикацией в Google Play

- `appId` после публикации не меняется — проверить сейчас.
- Подписанная релизная сборка (`assembleRelease` / AAB) с ключом в секретах репозитория.
- Политика конфиденциальности (вопрос В6, `docs/backend/BLOCKERS.md`).
