#!/bin/sh
# Мониторинг MILO на сервере (запуск по cron каждые 5 минут, см. docs/deployment/README.md §9).
# Проверяет /api/v1/health/ready (backend, база, Redis) и состояние контейнеров compose; при смене
# состояния (работает → не работает и обратно) шлёт сообщение в группу Telegram ботом поддержки.
# Без зависимостей: sh, curl, docker. Секреты читаются из ~/milo/.env, в логи не попадают.
# Не видит падение самого VPS (скрипт работает на нём же) — для этого нужен внешний сторож.
set -u

APP_DIR="${MILO_DIR:-$HOME/milo}"
STATE_FILE="${MILO_MONITOR_STATE:-$HOME/.milo-monitor-state}"
ENV_FILE="$APP_DIR/.env"

# Значение переменной из .env (без `source`: файл не исполняем)
env_value() {
  sed -n "s/^$1=//p" "$ENV_FILE" | tail -n 1 | tr -d '\r"'"'"
}

DOMAIN="$(env_value DOMAIN)"
TOKEN="$(env_value TELEGRAM_SUPPORT_BOT_TOKEN)"
CHAT_ID="$(env_value TELEGRAM_SUPPORT_CHAT_ID)"

if [ -z "$DOMAIN" ]; then
  echo "monitor: DOMAIN не задан в $ENV_FILE" >&2
  exit 2
fi

problems=""

# 1. Сайт и backend с базой и Redis
if ! curl -fsS -m 15 -o /dev/null "https://$DOMAIN/api/v1/health/ready" 2>/dev/null; then
  problems="${problems}• сайт или backend не отвечает (/api/v1/health/ready)
"
fi

# 2. Контейнеры: backend, web, postgres, redis должны быть запущены (migrate — разовый)
running="$(cd "$APP_DIR" && docker compose -f compose.prod.yaml ps --status running --format '{{.Service}}' 2>/dev/null)"
for service in backend web postgres redis; do
  if ! printf '%s\n' "$running" | grep -qx "$service"; then
    problems="${problems}• контейнер $service не запущен
"
  fi
done

if [ -z "$problems" ]; then
  current="ok"
else
  current="fail"
fi
previous="$(cat "$STATE_FILE" 2>/dev/null || echo ok)"

# Сообщаем только о смене состояния — без повторов каждые 5 минут
if [ "$current" = "$previous" ]; then
  exit 0
fi

if [ "$current" = "fail" ]; then
  text="🔴 MILO ($DOMAIN): неполадки
$problems"
else
  text="🟢 MILO ($DOMAIN): всё работает снова"
fi

# Состояние запоминаем только после успешной отправки, иначе сообщение повторится на следующем запуске.
# Telegram с сервера доступен по IPv6 (B-25), поэтому -6.
if [ -n "$TOKEN" ] && [ -n "$CHAT_ID" ]; then
  if curl -fsS -6 -m 20 -o /dev/null "https://api.telegram.org/bot$TOKEN/sendMessage" \
    --data-urlencode "chat_id=$CHAT_ID" --data-urlencode "text=$text" 2>/dev/null; then
    echo "$current" >"$STATE_FILE"
  else
    echo "monitor: не удалось отправить сообщение в Telegram" >&2
    exit 1
  fi
else
  echo "monitor: нет токена или группы бота поддержки — $current" >&2
  echo "$current" >"$STATE_FILE"
fi
