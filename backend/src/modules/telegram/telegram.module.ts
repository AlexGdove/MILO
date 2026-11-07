import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { GrammyBotApi } from './bot-api.js';
import { ModerationBotService } from './moderation-bot.service.js';
import { SupportBotService } from './support-bot.service.js';
import { TelegramCommonService } from './telegram-common.service.js';
import { TelegramPollingService } from './telegram-polling.service.js';
import { getTelegramConfig } from './telegram.config.js';
import { TELEGRAM_BOTS, type TelegramBots } from './telegram.tokens.js';
import { ModerationModule } from '../moderation/moderation.module.js';
import { OutboxModule } from '../outbox/outbox.module.js';
import { SupportModule } from '../support/support.module.js';

/** Два Telegram-бота (этап 9, B-18): поддержка и модерация. Без токенов — не запускаются. */
@Module({
  imports: [SupportModule, ModerationModule, OutboxModule],
  providers: [
    {
      provide: TELEGRAM_BOTS,
      inject: [ConfigService],
      useFactory: (config: ConfigService): TelegramBots => {
        const settings = getTelegramConfig(config);
        const handle = (bot: keyof TelegramBots) => {
          const entry = settings[bot];
          return entry ? { api: new GrammyBotApi(entry.token), chatId: entry.chatId } : null;
        };
        return { support: handle('support'), moderation: handle('moderation') };
      },
    },
    TelegramCommonService,
    SupportBotService,
    ModerationBotService,
    TelegramPollingService,
  ],
  exports: [SupportBotService, ModerationBotService],
})
export class TelegramModule {}
