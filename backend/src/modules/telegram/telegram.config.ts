import type { ConfigService } from '@nestjs/config';

import type { TelegramBot } from '../../generated/prisma/client.js';

export interface BotConfig {
  token: string;
  /** Чат операторов (группа); `null` — бот отвечает только на `/id` */
  chatId: number | null;
}

export type TelegramConfig = Record<TelegramBot, BotConfig | null>;

const ENV_PREFIX: Record<TelegramBot, string> = {
  support: 'TELEGRAM_SUPPORT',
  moderation: 'TELEGRAM_MODERATION',
};

/** Настройки ботов из проверенного окружения (`validateEnv`); без токена бота нет. */
export function getTelegramConfig(config: Pick<ConfigService, 'get'>): TelegramConfig {
  const read = (bot: TelegramBot): BotConfig | null => {
    const token = config.get<string>(`${ENV_PREFIX[bot]}_BOT_TOKEN`);
    if (!token) return null;
    const chatId = config.get<string>(`${ENV_PREFIX[bot]}_CHAT_ID`);
    return { token, chatId: chatId ? Number(chatId) : null };
  };
  return { support: read('support'), moderation: read('moderation') };
}
