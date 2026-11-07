# Выгрузка MILO на сервер

Один VPS (решения B-1, B-22): Caddy (HTTPS и веб-версия) → backend → PostgreSQL и Redis, всё в Docker. Конфигурация — `compose.prod.yaml` и `.env.example` в корне репозитория.

## 1. Что нужно заранее

- VPS с Ubuntu 24.04, публичный IPv4; пользователь `deploy` с sudo и входом по SSH-ключу.
- Домен (или поддомен), DNS-запись **A → IP сервера** — до первого запуска, иначе Caddy не получит сертификат.
- Токены двух Telegram-ботов и номера их групп (`/id` в группе) — `backend/README.md`.

## 2. Подготовка сервера

1. Docker Engine и плагин Compose — по официальной инструкции: https://docs.docker.com/engine/install/ubuntu/ (репозиторий Docker, не пакет `docker.io` из Ubuntu).
2. Docker без sudo, затем выйти и войти по SSH заново:
   ```bash
   sudo usermod -aG docker deploy
   ```
3. Файрвол — только SSH, 80 и 443:
   ```bash
   sudo ufw allow OpenSSH && sudo ufw allow 80/tcp && sudo ufw allow 443 && sudo ufw enable
   ```

## 3. Код и настройки

```bash
git clone https://github.com/AlexGdove/MILO.git ~/milo && cd ~/milo
cp .env.example .env
chmod 600 .env
openssl rand -hex 24   # пароль для POSTGRES_PASSWORD
nano .env
```

Заполнить: `DOMAIN`, `POSTGRES_PASSWORD`, `TELEGRAM_SUPPORT_BOT_TOKEN`, `TELEGRAM_SUPPORT_CHAT_ID`, `TELEGRAM_MODERATION_BOT_TOKEN`, `TELEGRAM_MODERATION_CHAT_ID`. Файл `.env` в git не попадает. Пустое значение — то же, что не задано (бот без токена не запускается).

## 4. Запуск

```bash
docker compose -f compose.prod.yaml up -d --build
```

| Сервис     | Что делает                                                                                    |
| ---------- | --------------------------------------------------------------------------------------------- |
| `postgres` | база (том `postgres-data`), наружу не открыта                                                 |
| `redis`    | счётчики лимитов (на диск не сохраняются), наружу не открыт                                   |
| `migrate`  | применяет миграции (`prisma migrate deploy`) и завершается                                    |
| `backend`  | API NestJS и Telegram-боты; стартует после миграций                                           |
| `web`      | Caddy: HTTPS (Let's Encrypt, продление само), веб-версия PWA, `/api` и `/socket.io` → backend |

Наружу открыты только 80 и 443 (`web`).

## 5. Проверка

```bash
docker compose -f compose.prod.yaml ps        # backend и web — Up (healthy), migrate — Exited (0)
curl https://<домен>/api/v1/health/ready      # {"status":"ok","checks":{"database":"ok","redis":"ok"}}
```

Открыть `https://<домен>` в браузере — приложение; «Профиль → ⚙ → Техподдержка» — чат.

## 6. Telegram-боты

Оператор (Telegram ID — `/id` в любом из ботов):

```bash
docker compose -f compose.prod.yaml exec backend node dist/cli/operator.js add <Telegram ID> <Имя>
docker compose -f compose.prod.yaml exec backend node dist/cli/operator.js list
```

**Один запущенный сервер на токен** (long polling, B-21): пока работает сервер на VPS, локальный `npm run dev` с теми же токенами не запускать — Telegram ответит 409, и боты будут работать через раз. Локально — закомментировать `TELEGRAM_*` в `backend/.env` или завести отдельных тестовых ботов.

## 7. Мобильное приложение

GitHub → Settings → Secrets and variables → Actions → **Variables**: `MILO_API_URL` = `https://<домен>/api/v1`. Затем пересобрать APK (workflow «Android APK») и iOS build. Адреса приложения (`https://localhost`, `capacitor://localhost`) в CORS уже разрешены в `compose.prod.yaml`.

## 8. Обновление, логи, резервные копии

```bash
# Обновление (миграции применятся сами — сервис migrate)
cd ~/milo && git pull && docker compose -f compose.prod.yaml up -d --build

# Логи
docker compose -f compose.prod.yaml logs -f backend
docker compose -f compose.prod.yaml logs -f web

# Резервная копия базы
docker compose -f compose.prod.yaml exec -T postgres pg_dump -U milo milo | gzip > milo-$(date +%F).sql.gz

# Восстановление (в пустую базу)
gunzip -c milo-ДАТА.sql.gz | docker compose -f compose.prod.yaml exec -T postgres psql -U milo milo

# Остановить (данные остаются в томах)
docker compose -f compose.prod.yaml down
```

**`down -v` не использовать**: удаляет тома — базу и сертификаты.

Резервные копии храните не только на этом сервере (скачать на компьютер: `scp deploy@<IP>:~/milo/milo-*.sql.gz .`). Автоматическое копирование по расписанию — этап 14.
