import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { type BotHandle, TELEGRAM_BOTS, type TelegramBots } from './telegram.tokens.js';
import { clientErrorText } from './texts.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CLIENT_ERROR_EVENT } from '../client-errors/client-errors.service.js';
import { OutboxWorker } from '../outbox/outbox.worker.js';

/**
 * Сообщения об ошибках приложения (решение №62): отправляет бот поддержки в тему
 * `TELEGRAM_ERRORS_THREAD_ID` (нет — в свою тему). Без чата операторов события ждут в outbox.
 */
@Injectable()
export class ClientErrorBotService implements OnModuleInit {
  constructor(
    @Inject(TELEGRAM_BOTS) private readonly bots: TelegramBots,
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxWorker,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    if (this.bots.support?.chatId == null) return;
    this.outbox.register(CLIENT_ERROR_EVENT, (payload) => this.onReported(payload));
  }

  private get bot(): BotHandle & { chatId: number } {
    const bot = this.bots.support;
    if (bot?.chatId == null) throw new Error('Support bot chat is not configured');
    return { ...bot, chatId: bot.chatId };
  }

  /** Тема для ошибок: своя, иначе тема бота поддержки. */
  private get threadId(): number | undefined {
    const own = this.config.get<string>('TELEGRAM_ERRORS_THREAD_ID');
    if (own) return Number(own);
    return this.bot.threadId ?? undefined;
  }

  private async onReported(payload: unknown): Promise<void> {
    const id = (payload as { id?: unknown } | null)?.id;
    if (typeof id !== 'string') throw new Error('Outbox payload has no id');
    const row = await this.prisma.clientError.findUnique({ where: { id } });
    // Строку успела удалить очистка — сообщать не о чем
    if (!row) return;
    const threadId = this.threadId;
    await this.bot.api.sendMessage(this.bot.chatId, clientErrorText(row), {
      ...(threadId !== undefined && { threadId }),
    });
  }
}
