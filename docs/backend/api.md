# API backend MILO — контракты (этап 2)

Базовый путь `/api/v1`, JSON, UTF-8. Концепция — `DECISIONS.md` B-6…B-11, данные — `database.md`. Swagger (`/api/docs`) генерируется из DTO на этапе 3 и должен совпадать с этим документом.

## Общие правила

| Тема                     | Правило                                                                                                                                                                           |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ключ устройства          | Заголовок `X-Device-Key: mk_<43 символа base64url>`. Нет или неизвестен → `401 device_key_required` / `401 device_key_invalid`. Заблокирован → `403 device_key_blocked` на запись |
| Идемпотентность          | `POST` с созданием (рецепт, жалоба, обращение, сообщение) принимает `Idempotency-Key: <uuid>`; повтор с тем же телом → тот же ответ; с другим телом → `422 idempotency_mismatch`  |
| Оптимистичная блокировка | Правка рецепта передаёт `version`; расхождение → `409 version_conflict` с текущей версией                                                                                         |
| Пагинация                | Курсорная: `?limit=20&cursor=<opaque>` (limit 1–50, по умолчанию 20) → `{ items, nextCursor \| null }`                                                                            |
| Числа                    | КБЖУ и количества — JSON-числа, не более 2 знаков после запятой                                                                                                                   |
| Время                    | ISO 8601 UTC (`2026-11-05T12:00:00.000Z`)                                                                                                                                         |
| Ошибки                   | `{ "error": { "code": "snake_case", "message": "для разработчика", "details"?: [...], "requestId": "..." } }`. Тексты для людей — на клиенте по `code`                            |
| Лимиты                   | `429 rate_limited` + `Retry-After`. Таблица — `architecture.md` §5                                                                                                                |
| CORS                     | Только адреса фронтенда из ENV (`CORS_ORIGINS`)                                                                                                                                   |

## Модели ответов

```ts
type Unit = 'g' | 'ml' | 'pcs';
type Nutrients = { kcal: number; protein: number; fat: number; carbs: number };

interface PublicIngredient {
  name: string; // 1–80
  amount: number; // > 0, ≤ 100 000, на весь рецепт
  unit: Unit;
  pieceWeight: number | null; // обязателен при pcs
  per100g: Nutrients; // kcal 0–900; БЖУ 0–100, сумма ≤ 100
}

interface PublicRecipeSummary {
  id: string;
  name: string;
  servings: number;
  ingredientCount: number;
  perServing: Nutrients; // вычислено сервером
  publishedAt: string;
}

interface PublicRecipe extends PublicRecipeSummary {
  ingredients: PublicIngredient[]; // 1–50, по порядку
  version: number;
  updatedAt: string;
  isMine: boolean; // true, если запрос с ключом автора
  status: 'published' | 'hidden'; // hidden виден только автору
}

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

| Метод и путь             | Ключ | Тело / параметры | Ответ                                                                                                       |
| ------------------------ | ---- | ---------------- | ----------------------------------------------------------------------------------------------------------- |
| `POST /device-keys`      | —    | —                | `201 { key }` — показывается один раз; клиент создаёт ключ лениво (первая публикация, жалоба или обращение) |
| `DELETE /device-keys/me` | да   | —                | `204`; удаляет ключ и каскадом рецепты, жалобы, обращения устройства (`database.md`)                        |

## Публичные рецепты

| Метод и путь                       | Ключ         | Тело / параметры                                                         | Ответ                                                                                     |
| ---------------------------------- | ------------ | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `GET /public-recipes`              | не нужен     | `?q=` (2–60 символов, поиск по названию), `limit`, `cursor`              | `200 { items: PublicRecipeSummary[], nextCursor }` — только `published`, новые сверху     |
| `GET /public-recipes/:id`          | необязателен | —                                                                        | `200 PublicRecipe`; `hidden` — только автору, иначе `404 recipe_not_found`                |
| `POST /public-recipes`             | да           | `{ name, servings, ingredients: PublicIngredient[] }`                    | `201 PublicRecipe`; `400 validation_failed` с `details`                                   |
| `PUT /public-recipes/:id`          | да, автор    | то же + `version`                                                        | `200 PublicRecipe` (version + 1); `403 not_author`; `409 version_conflict`                |
| `DELETE /public-recipes/:id`       | да, автор    | —                                                                        | `204`; `403 not_author`                                                                   |
| `GET /me/public-recipes`           | да           | `limit`, `cursor`                                                        | `200 { items: (PublicRecipeSummary & { status })[], nextCursor }` — свои, включая скрытые |
| `POST /public-recipes/:id/reports` | да           | `{ reason: 'spam'\|'offensive'\|'not_food'\|'other', comment? (≤ 500) }` | `201 { id }`; `409 already_reported`; на свой рецепт — `400 cannot_report_own`            |

Правка скрытого рецепта автором допускается, но статус остаётся `hidden` — вернуть может только оператор.

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

## Служебные

| Метод и путь             | Назначение                                                                                                  |
| ------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `GET /health`            | живость процесса (`200 { status: 'ok' }`)                                                                   |
| `GET /health/ready`      | готовность: база и Redis доступны                                                                           |
| `POST /telegram/webhook` | только для Telegram: проверка `X-Telegram-Bot-Api-Secret-Token`; в разработке вместо webhook — long polling |

## Чего в API нет (B-6)

Регистрация, вход, профиль, норма, кладовая, дневник, покупки, приготовленные блюда, история, личные рецепты, импорт локальных данных — всё это остаётся на устройстве.
