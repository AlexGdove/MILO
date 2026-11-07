/** После стольких неудачных попыток событие больше не отправляется (остаётся в базе с ошибкой). */
export const OUTBOX_MAX_ATTEMPTS = 15;

const FIRST_DELAY_MS = 10_000;
const MAX_DELAY_MS = 60 * 60_000;

/**
 * Пауза перед следующей попыткой после `attempts` неудачных: 10 с, 20 с, 40 с … не больше часа.
 * 15 попыток растягиваются примерно на 6 часов — хватает пережить сбой Telegram или сети.
 */
export function retryDelayMs(attempts: number): number {
  const exponent = Math.max(0, attempts - 1);
  return Math.min(FIRST_DELAY_MS * 2 ** exponent, MAX_DELAY_MS);
}

const BOT_TOKEN = /\d{5,15}:[A-Za-z0-9_-]{30,64}/g;

/** Текст ошибки для базы и логов: без токенов ботов (сетевые ошибки содержат адрес запроса). */
export function safeErrorMessage(error: unknown, maxLength = 500): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(BOT_TOKEN, '<token>').slice(0, maxLength);
}
