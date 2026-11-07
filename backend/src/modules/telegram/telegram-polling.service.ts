import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { BotApi, Update } from './bot-api.js';
import { ModerationBotService } from './moderation-bot.service.js';
import { SupportBotService } from './support-bot.service.js';
import { TELEGRAM_BOTS, type TelegramBots } from './telegram.tokens.js';
import type { TelegramBot } from '../../generated/prisma/client.js';
import { safeErrorMessage } from '../outbox/outbox.retry.js';

const LONG_POLL_SEC = 30;
const RETRY_PAUSE_MS = 5_000;

/**
 * Получение обновлений long polling (B-21): сервер сам спрашивает Telegram — не нужен
 * публичный адрес и входящий маршрут. Один экземпляр сервера на токен: второй получит
 * от Telegram 409 (ошибка в логе, повтор через паузу). В тестах не запускается.
 */
@Injectable()
export class TelegramPollingService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(TelegramPollingService.name);
  private readonly abort = new AbortController();

  constructor(
    @Inject(TELEGRAM_BOTS) private readonly bots: TelegramBots,
    private readonly config: ConfigService,
    private readonly supportBot: SupportBotService,
    private readonly moderationBot: ModerationBotService,
  ) {}

  onApplicationBootstrap(): void {
    if (this.config.get('NODE_ENV') === 'test') return;
    const handlers: Record<TelegramBot, (update: Update) => Promise<void>> = {
      support: (update) => this.supportBot.handleUpdate(update),
      moderation: (update) => this.moderationBot.handleUpdate(update),
    };
    for (const bot of ['support', 'moderation'] as const) {
      const handle = this.bots[bot];
      if (!handle) continue;
      if (handle.chatId === null) {
        this.logger.warn(
          { bot },
          'Telegram bot has no operators chat: only /id works (set TELEGRAM_*_CHAT_ID)',
        );
      }
      void this.poll(bot, handle.api, handlers[bot]);
    }
  }

  onModuleDestroy(): void {
    this.abort.abort();
  }

  private async poll(
    bot: TelegramBot,
    api: BotApi,
    handle: (update: Update) => Promise<void>,
  ): Promise<void> {
    const { signal } = this.abort;
    let offset = 0;
    this.logger.log({ bot }, 'Telegram bot polling started');
    while (!signal.aborted) {
      try {
        const updates = await api.getUpdates(offset, LONG_POLL_SEC, signal);
        for (const update of updates) {
          offset = update.update_id + 1;
          await handle(update).catch((error: unknown) =>
            this.logger.error({ bot, err: safeErrorMessage(error) }, 'Telegram update failed'),
          );
        }
      } catch (error) {
        if (signal.aborted) break;
        this.logger.error({ bot, err: safeErrorMessage(error) }, 'Telegram polling failed');
        await new Promise((resolve) => setTimeout(resolve, RETRY_PAUSE_MS).unref());
      }
    }
  }
}
