# API backend MILO — контракты

Базовый путь `/api/v1`, JSON, UTF-8. Концепция — `DECISIONS.md` B-6, B-8, B-10, B-18 (ADR-0005), аккаунты — решения №60, №68, №69; данные — `database.md`. Swagger (`/api/docs`) генерируется из DTO на этапе 3 и должен совпадать с этим документом.

## Общие правила

| Тема            | Правило                                                                                                                                                                                |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ключ устройства | Заголовок `X-Device-Key: mk_<43 символа base64url>`. Нет или неизвестен → `401 device_key_required` / `401 device_key_invalid`. Заблокирован → `403 device_key_blocked` на запись      |
| Идемпотентность | `POST` с созданием (предложение продукта, обращение, сообщение) принимает `Idempotency-Key: <uuid>`; повтор с тем же телом → тот же ответ; с другим телом → `422 idempotency_mismatch` |
| Пагинация       | Курсорная: `?limit=20&cursor=<opaque>` (limit 1–50, по умолчанию 20) → `{ items, nextCursor \| null }`                                                                                 |
| Числа           | КБЖУ и количества — JSON-числа, не более 2 знаков после запятой                                                                                                                        |
| Время           | ISO 8601 UTC (`2026-11-05T12:00:00.000Z`)                                                                                                                                              |
| Ошибки          | `{ "error": { "code": "snake_case", "message": "для разработчика", "details"?: [...], "requestId": "..." } }`. Тексты для людей — на клиенте по `code`                                 |
| Лимиты          | `429 rate_limited` + `Retry-After`. Таблица — `architecture.md` §5                                                                                                                     |
| CORS            | Только адреса фронтенда из ENV (`CORS_ORIGINS`)                                                                                                                                        |

## Модели ответов

```ts
type Unit = 'g' | 'ml' | 'pcs';
type Nutrients = { kcal: number; protein: number; fat: number; carbs: number };

interface Product {
  id: string;
  name: string; // 1–120
  brand: string | null; // ≤ 80
  barcode: string | null; // EAN-8 / UPC-A / EAN-13 / GTIN-14, контрольная цифра верна
  unit: Unit;
  pieceWeight: number | null; // обязателен при pcs, ≤ 5000 г
  per100g: Nutrients; // kcal 0–900; БЖУ 0–100, сумма ≤ 100
  createdAt: string;
}

interface ProductSubmission {
  id: string;
  status: 'pending' | 'approved' | 'rejected'; // pending — ждёт человека
  flags: AutomodFlag[]; // замечания автомодерации
  reviewedBy: 'auto' | 'operator' | null;
  productId: string | null; // продукт общей базы (при approved)
  name: string;
  brand: string | null;
  barcode: string | null;
  createdAt: string;
}

type AutomodFlag =
  | 'banned_words' // → rejected
  | 'link_or_contact' // → rejected
  | 'gibberish' // → rejected
  | 'suspicious_text' // → pending
  | 'energy_mismatch' // → pending
  | 'barcode_conflict' // → pending
  | 'name_conflict' // → pending
  | 'untrusted_author'; // → pending

interface SupportTicket {
  id: string;
  number: number;
  status: 'open' | 'answered' | 'closed';
  createdAt: string;
  updatedAt: string;
  lastMessage: SupportMessage | null; // в списке
}

interface SupportMessage {
  id: string;
  author: 'user' | 'operator';
  operatorName: string | null;
  text: string; // 1–4000
  createdAt: string;
}
```

## Ключ устройства

| Метод и путь             | Ключ | Тело / параметры | Ответ                                                                                                         |
| ------------------------ | ---- | ---------------- | ------------------------------------------------------------------------------------------------------------- |
| `POST /device-keys`      | —    | —                | `201 { key }` — показывается один раз; клиент создаёт ключ лениво (первое предложение продукта или обращение) |
| `DELETE /device-keys/me` | да   | —                | `204`; удаляет ключ и каскадом предложения и обращения устройства; принятые продукты остаются в общей базе    |

## Общая база продуктов (B-18, ADR-0005)

| Метод и путь                  | Ключ     | Тело / параметры                                                            | Ответ                                                                                      |
| ----------------------------- | -------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `GET /products`               | не нужен | `?q=` (2–60, подстрока названия или бренда), `?barcode=`, `limit`, `cursor` | `200 { items: Product[], nextCursor }` — только принятые, новые сверху                     |
| `GET /products/:id`           | не нужен | —                                                                           | `200 Product`; нет или id не UUID — `404 product_not_found`                                |
| `POST /product-submissions`   | да       | `{ name, brand?, barcode?, unit, pieceWeight, per100g }`                    | `201 ProductSubmission` — решение автомодерации сразу; `400 validation_failed` с `details` |
| `GET /me/product-submissions` | да       | `limit`, `cursor`                                                           | `200 { items: ProductSubmission[], nextCursor }` — свои, новые сверху                      |

Решения оператора (`pending` → принять / отклонить) принимаются только в боте модерации — HTTP-маршрутов нет.

## Каталог Open Food Facts (решение №53)

| Метод и путь               | Ключ     | Параметры                   | Ответ                                                                   |
| -------------------------- | -------- | --------------------------- | ----------------------------------------------------------------------- |
| `GET /food-catalog/search` | не нужен | `?q=` (2–60, после обрезки) | `200 { items: CatalogFood[] }` — `{ code, name, brand, unit, per100g }` |

Для браузера и PWA: поиск Open Food Facts закрыт CORS, сервер ходит сам (`search.openfoodfacts.org`, User-Agent MILO). Ответ кэшируется в Redis на сутки (ключ — запрос без учёта регистра и лишних пробелов). К Open Food Facts — не больше 8 новых запросов в минуту со всего сервера, сверх — `503 catalog_busy`; Open Food Facts не ответил — `503 catalog_unavailable` (не кэшируется). Товары без полного КБЖУ на 100 г или с невозможными цифрами отбрасываются. Лимит клиента — `catalogRead` (120 в минуту с IP). Приложение ищет напрямую, штрихкод — везде напрямую.

## Поддержка

| Метод и путь                         | Ключ | Тело / параметры                           | Ответ                                                              |
| ------------------------------------ | ---- | ------------------------------------------ | ------------------------------------------------------------------ |
| `POST /support/tickets`              | да   | `{ text }` — первое сообщение              | `201 SupportTicket & { messages: SupportMessage[] }`               |
| `GET /support/tickets`               | да   | `limit`, `cursor`                          | `200 { items: SupportTicket[], nextCursor }` — новые сверху        |
| `GET /support/tickets/:id`           | да   | —                                          | `200 SupportTicket`; чужое — `404 ticket_not_found`                |
| `GET /support/tickets/:id/messages`  | да   | `?after=<messageId>` (дозагрузка), `limit` | `200 { items: SupportMessage[] }` — по возрастанию времени         |
| `POST /support/tickets/:id/messages` | да   | `{ text }`                                 | `201 SupportMessage`; в закрытое — переоткрывает (`status = open`) |
| `POST /support/tickets/:id/close`    | да   | —                                          | `200 SupportTicket`                                                |

Все маршруты — с `X-Device-Key`; **заблокированный ключ тоже может писать** — это путь обжалования блокировки (B-19). Чужое обращение неотличимо от несуществующего (`404 ticket_not_found`), id не UUID — тоже 404. `?after=` — сообщение этого обращения, иначе `400 validation_failed`; `limit` сообщений 1–100 (по умолчанию 50). Список обращений — по последней активности (`updatedAt`), курсорный. Лимиты: создание — `ticketCreate` (5 в сутки), сообщение и закрытие — `ticketMessage` (30 за 10 минут), чтение — `supportRead` (120 в минуту). `POST` создания принимают `Idempotency-Key`.

Статусы: сообщение пользователя → `open` (в том числе переоткрывает закрытое); ответ оператора (бот поддержки, этап 9) → `answered`; `POST …/close` → `closed` (повтор ничего не меняет). События outbox для бота: `ticket.created`, `ticket.message_from_user`, `ticket.closed`.

### WebSocket `/support` (Socket.IO)

- Адрес: путь `/socket.io`, пространство `/support` (без префикса `/api/v1`); CORS — как у HTTP (`CORS_ORIGINS`).
- Подключение: `auth: { deviceKey }`. Отказ при рукопожатии — `connect_error` с `message`: `device_key_required`, `device_key_invalid`, `rate_limited` (больше 30 подключений в минуту с IP), `service_unavailable`.
- Клиент автоматически получает события своих обращений (комната по `device_key_id`):
  - `message.created` → `{ ticketId, message: SupportMessage }` — и своё сообщение, и ответ оператора;
  - `ticket.updated` → `{ ticketId, status, updatedAt }`.
- Отправка сообщений — только через REST (идемпотентность, лимиты); WebSocket — только доставка. При обрыве клиент дочитывает `GET …/messages?after=`.

## Ошибки приложения (решение №62)

`POST /client-errors` (ключ устройства, `204`) — технический отчёт: `kind` (`error` | `unhandledrejection` | `render`), `message` (≤ 500), `stack` (≤ 4000), `platform` (`web` | `android` | `ios`), `appVersion`, `route` (путь без параметров), `userAgent`. Одинаковые ошибки одной версии объединяются по отпечатку (текст без чисел + верх стека), растёт `count`. В Telegram (бот поддержки, тема `TELEGRAM_ERRORS_THREAD_ID`) — первая ошибка и 10-я, 100-я, 1000-я. Лимит — 30 в час с устройства; строки без повторов 30 дней удаляются. Приложение шлёт отчёты, пока человек не отключил их в «Настройках».

## Аккаунты (решения №60, №68, №69)

Аккаунт необязателен и нужен только для тарифа; сервер хранит почту, хэш пароля, отметку о подтверждении почты, тариф (`free` | `plus` | `unlimited`) и срок действия. Личные данные (дневник, кладовая, рецепты) остаются на устройстве.

| Метод и путь                 | Доступ | Ответ                      | Что делает                                                                                                                                                      |
| ---------------------------- | ------ | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /auth/register`        | нет    | `202 { expiresInSeconds }` | создаёт аккаунт без подтверждения и шлёт код; повтор для неподтверждённой почты меняет пароль и шлёт новый код; подтверждённая почта → `409 email_taken`        |
| `POST /auth/register/resend` | нет    | `202 { expiresInSeconds }` | новый код подтверждения; ответ одинаковый для любой почты                                                                                                       |
| `POST /auth/register/verify` | нет    | `200 { token, account }`   | почта подтверждена, сразу вход                                                                                                                                  |
| `POST /auth/login`           | нет    | `200 { token, account }`   | вход по паролю; неверный пароль и несуществующая почта → `401 invalid_credentials`; `403 email_not_verified` и `403 account_blocked` — только при верном пароле |
| `POST /auth/password/forgot` | нет    | `202 { expiresInSeconds }` | код сброса на подтверждённую почту; ответ одинаковый для любой почты                                                                                            |
| `POST /auth/password/reset`  | нет    | `200 { token, account }`   | новый пароль, все прежние сессии закрываются, выдаётся новая                                                                                                    |
| `POST /auth/logout`          | сессия | `204`                      | выход из аккаунта                                                                                                                                               |
| `GET /account/me`            | сессия | `200 Account`              | возвращает `{ id, email, plan, planUntil }`                                                                                                                     |
| `DELETE /account/me`         | сессия | `204`                      | удаляет аккаунт, все сессии и коды этой почты                                                                                                                   |

- Пароль: 8–128 символов, не только пробелы, пробелы значимы; хранится хэш scrypt. При входе минимальная длина не проверяется.
- Коды: 6 цифр, действуют 10 минут, одноразовые, после 5 неверных попыток сгорают; у кода есть назначение (подтверждение почты или сброс пароля) — код одного назначения не подходит для другого. Новый код гасит прежний того же назначения. Хранится только HMAC.
- Токен сессии: `ms_` + 43 символа base64url, заголовок `Authorization: Bearer <токен>`; 90 дней, продлевается при активности (не чаще раза в час). Хранится только SHA-256.
- Лимиты с IP: регистрация — 10 в час; повторный код и «забыли пароль» — 10 в час; ввод кода — 30 за 10 минут; вход — 20 за 10 минут; маршруты аккаунта — 120 в минуту. На одну почту: 3 письма за 15 минут и 10 в сутки; 20 попыток входа в час.
- Письма — через интерфейс; почтовый сервис ещё не выбран. `EMAIL_TRANSPORT=log` — код в лог сервера (только разработка). В production без `AUTH_CODE_SECRET` и `EMAIL_TRANSPORT` регистрация, коды и сброс отвечают `503 auth_unavailable`; вход паролем работает.

## Коды ошибок

| Код                                          | Статус | Когда                                                                       |
| -------------------------------------------- | ------ | --------------------------------------------------------------------------- |
| `validation_failed`                          | 400    | тело, параметры, курсор или `Idempotency-Key` неверны; `details` — по полям |
| `device_key_required` / `device_key_invalid` | 401    | нет ключа / неверный или неизвестный                                        |
| `device_key_blocked`                         | 403    | заблокированный ключ на запись (удалить свои данные можно)                  |
| `session_required`                           | 401    | нет заголовка `Authorization`                                               |
| `session_invalid`                            | 401    | токен неверный, истёк, сессия закрыта или аккаунт заблокирован              |
| `invalid_credentials`                        | 401    | неверная почта или пароль                                                   |
| `code_invalid`                               | 401    | код неверный, истёк, использован, сгорел или другого назначения             |
| `email_not_verified`                         | 403    | почта не подтверждена                                                       |
| `account_blocked`                            | 403    | аккаунт заблокирован                                                        |
| `email_taken`                                | 409    | почта уже зарегистрирована                                                  |
| `auth_unavailable`                           | 503    | регистрация и письма выключены на сервере                                   |
| `product_not_found`                          | 404    | нет продукта или id не UUID                                                 |
| `ticket_not_found`                           | 404    | нет обращения, оно чужое или id не UUID                                     |
| `catalog_busy` / `catalog_unavailable`       | 503    | лимит запросов к Open Food Facts / Open Food Facts не отвечает              |
| `idempotency_mismatch`                       | 422    | тот же `Idempotency-Key` с другим запросом                                  |
| `rate_limited`                               | 429    | превышен лимит; `Retry-After` — секунды                                     |
| `service_unavailable`                        | 503    | база или Redis недоступны                                                   |

## Служебные

| Метод и путь             | Назначение                                                                                                        |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `GET /health`            | живость процесса (`200 { status: 'ok' }`)                                                                         |
| `GET /health/ready`      | готовность: база и Redis доступны                                                                                 |
| `POST /telegram/webhook` | два бота (поддержка и модерация, этап 9): проверка `X-Telegram-Bot-Api-Secret-Token`; в разработке — long polling |

## Чего в API нет (B-6)

Профиль, норма, кладовая, дневник, покупки, приготовленные блюда, история, рецепты (публикации рецептов нет, B-18), импорт локальных данных — всё это остаётся на устройстве.
