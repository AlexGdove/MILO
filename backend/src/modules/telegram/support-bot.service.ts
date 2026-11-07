import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';

import type { Update } from './bot-api.js';
import { inOperatorsChat, TelegramCommonService, topicOptions } from './telegram-common.service.js';
import { type BotHandle, TELEGRAM_BOTS, type TelegramBots } from './telegram.tokens.js';
import {
  newTicketText,
  notOperatorText,
  ONLY_TEXT,
  REPLY_FAILED,
  TICKET_GONE,
  ticketClosedText,
  TOO_LONG,
  userMessageText,
} from './texts.js';
import { AppException } from '../../common/errors/app.exception.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { safeErrorMessage } from '../outbox/outbox.retry.js';
import { OutboxWorker } from '../outbox/outbox.worker.js';
import {
  SupportService,
  TICKET_CLOSED_EVENT,
  TICKET_CREATED_EVENT,
  TICKET_USER_MESSAGE_EVENT,
} from '../support/support.service.js';

/** Длина ответа оператора — как у сообщения в базе (`support_messages.text`). */
const MAX_REPLY_LENGTH = 4000;
/** Сообщения бота об обращении: по ним узнаётся ответ на удалённое обращение. */
const TICKET_MESSAGE = /^(🆘|💬) Обращение № \d+/u;

function payloadField(payload: Prisma.JsonValue, field: string): string {
  const value =
    payload && typeof payload === 'object' && !Array.isArray(payload) ? payload[field] : undefined;
  if (typeof value !== 'string') throw new Error(`Outbox payload has no ${field}`);
  return value;
}

/**
 * Бот поддержки (B-10, B-19): обращения пользователей — в чат операторов, ответ оператора
 * (reply на сообщение бота) — пользователю в приложение. Все сообщения обращения — ответы на
 * первое («Обращение № N»), так в группе видна вся переписка.
 */
@Injectable()
export class SupportBotService implements OnModuleInit {
  private readonly logger = new Logger(SupportBotService.name);

  constructor(
    @Inject(TELEGRAM_BOTS) private readonly bots: TelegramBots,
    private readonly prisma: PrismaService,
    private readonly support: SupportService,
    private readonly common: TelegramCommonService,
    private readonly outbox: OutboxWorker,
  ) {}

  /** Без чата операторов события ждут в outbox, пока чат не настроят. */
  onModuleInit(): void {
    if (this.bots.support?.chatId == null) return;
    this.outbox.register(TICKET_CREATED_EVENT, (payload) =>
      this.onTicketCreated(payloadField(payload, 'ticketId')),
    );
    this.outbox.register(TICKET_USER_MESSAGE_EVENT, (payload) =>
      this.onUserMessage(payloadField(payload, 'messageId')),
    );
    this.outbox.register(TICKET_CLOSED_EVENT, (payload) =>
      this.onTicketClosed(payloadField(payload, 'ticketId')),
    );
  }

  private get bot(): BotHandle & { chatId: number } {
    const bot = this.bots.support;
    if (bot?.chatId == null) throw new Error('Support bot chat is not configured');
    return { ...bot, chatId: bot.chatId };
  }

  private async onTicketCreated(ticketId: string): Promise<void> {
    // Удалённое обращение (пользователь удалил данные) отправлять некому — событие закрыто
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (ticket) await this.rootMessage(ticket);
  }

  private async onUserMessage(messageId: string): Promise<void> {
    const message = await this.prisma.supportMessage.findUnique({
      where: { id: messageId },
      include: { ticket: true },
    });
    if (!message) return;
    const { root, created } = await this.rootMessage(message.ticket);
    // Новое «Обращение № N» уже содержит первое сообщение — второй раз его не повторяем
    if (created && (await this.isFirstMessage(message.ticketId, message.id))) return;
    await this.sendInThread(
      message.ticketId,
      root,
      userMessageText(message.ticket.number, message.text),
    );
  }

  private async onTicketClosed(ticketId: string): Promise<void> {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) return;
    const { root } = await this.rootMessage(ticket);
    await this.sendInThread(ticketId, root, ticketClosedText(ticket.number));
  }

  /**
   * Первое сообщение бота об обращении в текущем чате операторов. Если его нет (событие
   * `ticket.created` не дошло или сменился чат) — отправляется сейчас с первым сообщением.
   */
  private async rootMessage(ticket: {
    id: string;
    number: number;
  }): Promise<{ root: number; created: boolean }> {
    const bot = this.bot;
    const { api, chatId } = bot;
    const existing = await this.prisma.telegramMessageLink.findFirst({
      where: { chatId: BigInt(chatId), ticketId: ticket.id },
      orderBy: { createdAt: 'asc' },
    });
    if (existing) return { root: existing.messageId, created: false };
    const first = await this.prisma.supportMessage.findFirst({
      where: { ticketId: ticket.id },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    const sent = await api.sendMessage(
      chatId,
      newTicketText(ticket.number, first?.text ?? ''),
      topicOptions(bot),
    );
    await this.link(ticket.id, sent.messageId);
    return { root: sent.messageId, created: true };
  }

  private async sendInThread(ticketId: string, root: number, text: string): Promise<void> {
    const bot = this.bot;
    const sent = await bot.api.sendMessage(bot.chatId, text, {
      replyTo: root,
      ...topicOptions(bot),
    });
    // Ответ оператора на любое сообщение обращения тоже попадёт в нужное обращение
    await this.link(ticketId, sent.messageId);
  }

  private async link(ticketId: string, messageId: number): Promise<void> {
    await this.prisma.telegramMessageLink.create({
      data: { chatId: BigInt(this.bot.chatId), messageId, ticketId },
    });
  }

  private async isFirstMessage(ticketId: string, messageId: string): Promise<boolean> {
    const first = await this.prisma.supportMessage.findFirst({
      where: { ticketId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: { id: true },
    });
    return first?.id === messageId;
  }

  /** Обновление от Telegram: команды и ответы операторов в чате операторов. */
  async handleUpdate(update: Update): Promise<void> {
    const bot = this.bots.support;
    if (!bot || !(await this.common.firstTime('support', update.update_id))) return;
    const message = update.message;
    if (!message || (await this.common.answerCommand(bot.api, message))) return;
    if (!inOperatorsChat(bot, message)) return;
    const replied = message.reply_to_message;
    if (!replied || !message.from) return;

    const reply = (text: string) =>
      bot.api.sendMessage(message.chat.id, text, {
        replyTo: message.message_id,
        ...topicOptions(bot),
      });
    const link = await this.prisma.telegramMessageLink.findUnique({
      where: {
        chatId_messageId: { chatId: BigInt(message.chat.id), messageId: replied.message_id },
      },
      select: { ticketId: true },
    });
    if (!link?.ticketId) {
      // Ответ на сообщение об обращении, которого больше нет; на прочие сообщения — молчим
      if (replied.from?.is_bot && TICKET_MESSAGE.test(replied.text ?? '')) {
        await reply(TICKET_GONE);
      }
      return;
    }
    const operator = await this.common.activeOperator(message.from.id);
    if (!operator) {
      await reply(notOperatorText(message.from.id));
      return;
    }
    const text = message.text?.trim();
    if (!text) {
      await reply(ONLY_TEXT);
      return;
    }
    if (Array.from(text).length > MAX_REPLY_LENGTH) {
      await reply(TOO_LONG);
      return;
    }
    try {
      await this.support.addOperatorReply(operator.id, link.ticketId, text);
    } catch (error) {
      const gone = error instanceof AppException && error.code === 'ticket_not_found';
      if (!gone) {
        this.logger.error({ err: safeErrorMessage(error) }, 'Operator reply failed');
      }
      await reply(gone ? TICKET_GONE : REPLY_FAILED);
      return;
    }
    // Реакция — подтверждение «доставлено»; если не вышло, ответ всё равно сохранён
    await bot.api.react(message.chat.id, message.message_id, '👍').catch(() => undefined);
  }
}
