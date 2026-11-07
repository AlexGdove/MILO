import type { BotApi } from './bot-api.js';
import type { TelegramBot } from '../../generated/prisma/client.js';

/** Боты приложения: клиент Bot API и чат операторов. Тесты подменяют провайдер целиком. */
export const TELEGRAM_BOTS = Symbol('TELEGRAM_BOTS');

export interface BotHandle {
  api: BotApi;
  /** Чат операторов; `null` — бот отвечает только на `/id` */
  chatId: number | null;
  /** Тема в группе с темами (B-23); `null` или нет — весь чат */
  threadId?: number | null;
}

export type TelegramBots = Record<TelegramBot, BotHandle | null>;
