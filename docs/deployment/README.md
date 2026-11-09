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
   Docker открывает опубликованные порты в обход ufw — поэтому в `compose.prod.yaml` наружу опубликованы только 80 и 443, база и Redis портов не публикуют.
4. **Вход только по SSH-ключу** (B-24). Сначала убедиться, что вход по ключу под `deploy` работает, **в отдельном окне** — иначе можно запереть себя снаружи:
   ```bash
   sudo tee /etc/ssh/sshd_config.d/90-milo.conf >/dev/null <<'EOF'
   PasswordAuthentication no
   KbdInteractiveAuthentication no
   PermitRootLogin no
   MaxAuthTries 3
   EOF
   sudo sshd -t && sudo systemctl reload ssh
   ```
   Не закрывая текущее окно, проверить вход в новом: `ssh milo-vps`.
5. **Автоматические обновления безопасности** системы:
   ```bash
   sudo apt-get install -y unattended-upgrades && sudo dpkg-reconfigure -plow unattended-upgrades
   ```
6. **fail2ban** — блокирует IP после неудачных попыток входа по SSH (с ключами необязателен, но убирает шум из логов):
   ```bash
   sudo apt-get install -y fail2ban && sudo systemctl enable --now fail2ban
   ```
7. **Файл подкачки** на сервере с 2 ГБ памяти — запас на сборку образов:
   ```bash
   sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   ```

Защита в самих контейнерах (`compose.prod.yaml`, B-24): логи с ротацией (3 × 10 МБ на сервис), лимиты памяти, `no-new-privileges`, backend и Caddy — файловая система только для чтения и без лишних прав. Caddy: тайм-ауты для медленных клиентов, тело запроса до 1 МБ, CSP и Permissions-Policy для веб-версии. Лимиты запросов — в backend (Redis).

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

**Если боты молчат**, в логах backend — `Telegram polling failed` / `Network request for 'getUpdates' failed`: проверить доступ к Telegram с сервера — `curl -4 -m 6 -sI https://api.telegram.org` и `curl -6 -m 6 -sI https://api.telegram.org`. У части провайдеров Telegram доступен только по IPv6 — поэтому в `compose.prod.yaml` у сети контейнеров включён IPv6 (B-25). Если не отвечают оба — нужен другой сервер или регион.

Сообщения об ошибках приложения (решение №62) бот поддержки шлёт в тему `TELEGRAM_ERRORS_THREAD_ID` (создайте тему «Ошибки» в группе и узнайте её номер командой `/id@<бот>`); без неё — в тему поддержки.

Две группы или одна группа с темами (B-23): во втором случае у обоих ботов одинаковый `TELEGRAM_*_CHAT_ID`, а `TELEGRAM_SUPPORT_THREAD_ID` и `TELEGRAM_MODERATION_THREAD_ID` — номера их тем.

Оператор (Telegram ID — `/id` в любом из ботов):

```bash
docker compose -f compose.prod.yaml exec backend node dist/cli/operator.js add <Telegram ID> <Имя>
docker compose -f compose.prod.yaml exec backend node dist/cli/operator.js list
```

**Один запущенный сервер на токен** (long polling, B-21): пока работает сервер на VPS, локальный `npm run dev` с теми же токенами не запускать — Telegram ответит 409, и боты будут работать через раз. Локально — закомментировать `TELEGRAM_*` в `backend/.env` или завести отдельных тестовых ботов.

## 7. Мобильное приложение

GitHub → Settings → Secrets and variables → Actions → **Variables**: `MILO_API_URL` = `https://<домен>/api/v1`. Затем пересобрать APK: Actions → «Android APK» → **Run workflow** → ветка `main` — ссылка на скачивание (`android-latest`) обновится сама; так же — iOS build. Адрес вшивается в приложение при сборке: APK, собранный до появления переменной, сервера не знает. Адреса приложения (`https://localhost`, `capacitor://localhost`) в CORS уже разрешены в `compose.prod.yaml`.

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

Резервные копии храните не только на этом сервере (скачать на компьютер: `scp deploy@<IP>:~/milo/milo-*.sql.gz .`). Автоматического копирования нет (решение №59).

## 9. Мониторинг

Скрипт `scripts/monitor.sh` проверяет `https://<домен>/api/v1/health/ready` и что контейнеры backend, web, postgres, redis запущены. При смене состояния шлёт сообщение в группу Telegram ботом поддержки (🔴 неполадки / 🟢 снова работает), повторов нет. Токен и группа берутся из `~/milo/.env`.

Включение (под пользователем `deploy`, один раз):

```bash
chmod +x ~/milo/scripts/monitor.sh
( crontab -l 2>/dev/null; echo '*/5 * * * * $HOME/milo/scripts/monitor.sh >> $HOME/.milo-monitor.log 2>&1' ) | crontab -
```

Проверка: остановить `docker compose -f compose.prod.yaml stop web` — в течение 5 минут придёт 🔴; `start web` — 🟢.

Ограничение: скрипт работает на том же VPS и не заметит падение самого сервера. Для этого нужен внешний сторож (например, бесплатный UptimeRobot на `/api/v1/health/ready`).

Резервных копий по расписанию нет — решение владельца (№59): копии делаются вручную (§8).
