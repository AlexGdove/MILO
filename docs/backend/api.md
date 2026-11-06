# API backend MILO — контракты

Базовый путь `/api/v1`, JSON, UTF-8. Концепция — `DECISIONS.md` B-6, B-8, B-10, B-18 (ADR-0005), данные — `database.md`. Swagger (`/api/docs`) генерируется из DTO на этапе 3 и должен совпадать с этим документом.

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

## Поддержка

| Метод и путь                         | Ключ | Тело / параметры                           | Ответ                                                              |
| ------------------------------------ | ---- | ------------------------------------------ | ------------------------------------------------------------------ |
| `POST /support/tickets`              | да   | `{ text }` — первое сообщение              | `201 SupportTicket & { messages: SupportMessage[] }`               |
| `GET /support/tickets`               | да   | `limit`, `cursor`                          | `200 { items: SupportTicket[], nextCursor }` — новые сверху        |
| `GET /support/tickets/:id`           | да   | —                                          | `200 SupportTicket`; чужое — `404 ticket_not_found`                |
| `GET /support/tickets/:id/messages`  | да   | `?after=<messageId>` (дозагрузка), `limit` | `200 { items: SupportMessage[] }` — по возрастанию времени         |
| `POST /support/tickets/:id/messages` | да   | `{ text }`                                 | `201 SupportMessage`; в закрытое — переоткрывает (`status = open`) |
| `POST /support/tickets/:id/close`    | да   | —                                          | `200 SupportTicket`                                                |

### WebSocket `/support` (Socket.IO)

- Подключение: `auth: { deviceKey }`; неверный ключ — отказ при рукопожатии.
- Клиент автоматически получает события своих обращений (комната по `device_key_id`):
  - `message.created` → `{ ticketId, message: SupportMessage }`;
  - `ticket.updated` → `{ ticketId, status, updatedAt }`.
- Отправка сообщений — только через REST (идемпотентность, лимиты); WebSocket — только доставка. При обрыве клиент дочитывает `GET …/messages?after=`.

## Коды ошибок

| Код                                          | Статус | Когда                                                                       |
| -------------------------------------------- | ------ | --------------------------------------------------------------------------- |
| `validation_failed`                          | 400    | тело, параметры, курсор или `Idempotency-Key` неверны; `details` — по полям |
| `device_key_required` / `device_key_invalid` | 401    | нет ключа / неверный или неизвестный                                        |
| `device_key_blocked`                         | 403    | заблокированный ключ на запись (удалить свои данные можно)                  |
| `product_not_found`                          | 404    | нет продукта или id не UUID                                                 |
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

Регистрация, вход, профиль, норма, кладовая, дневник, покупки, приготовленные блюда, история, рецепты (публикации рецептов нет, B-18), импорт локальных данных — всё это остаётся на устройстве.
