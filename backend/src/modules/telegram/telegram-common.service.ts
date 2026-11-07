import { Injectable } from '@nestjs/common';

import type { BotApi } from './bot-api.js';
import type { BotHandle } from './telegram.tokens.js';
import { idText, START_TEXT } from './texts.js';
import type { Operator, TelegramBot } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

type IncomingMessage = {
  message_id: number;
  chat: { id: number; type: string };
  from?: { id: number };
  text?: string;
  message_thread_id?: number;
  is_topic_message?: boolean;
};

const COMMAND = /^\/([a-z]+)(?:@\w+)?(?:\s|$)/;

/** Параметры отправки в тему бота (группа с темами, B-23); без темы — пусто. */
export const topicOptions = (bot: BotHandle): { threadId?: number } =>
  bot.threadId != null ? { threadId: bot.threadId } : {};

/**
 * Сообщение из чата операторов этого бота: та же группа и — если задана — та же тема.
 * В группе с темами каждый бот работает только в своей теме.
 */
export const inOperatorsChat = (
  bot: BotHandle,
  message: { chat: { id: number }; message_thread_id?: number },
): boolean =>
  bot.chatId !== null &&
  message.chat.id === bot.chatId &&
  (bot.threadId == null || message.message_thread_id === bot.threadId);

/** Общее для обоих ботов: дедупликация обновлений, операторы, служебные команды. */
@Injectable()
export class TelegramCommonService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Обновление пришло впервые. Telegram повторяет обновления после перезапуска long polling —
   * повтор игнорируется (таблица `telegram_updates`, ключ — бот и номер).
   */
  async firstTime(bot: TelegramBot, updateId: number): Promise<boolean> {
    const { count } = await this.prisma.telegramUpdate.createMany({
      data: [{ bot, updateId: BigInt(updateId) }],
      skipDuplicates: true,
    });
    return count === 1;
  }

  /** Активный оператор по Telegram ID; иначе `null` — действовать нельзя. */
  activeOperator(telegramUserId: number): Promise<Operator | null> {
    return this.prisma.operator.findFirst({
      where: { telegramUserId: BigInt(telegramUserId), active: true },
    });
  }

  /**
   * `/id` — номер чата и Telegram ID (для настроек сервера и добавления оператора), `/start` —
   * что это за бот. Возвращает `true`, если сообщение было командой и ответ отправлен.
   */
  async answerCommand(api: BotApi, message: IncomingMessage): Promise<boolean> {
    const command = COMMAND.exec(message.text ?? '')?.[1];
    if (command === 'id') {
      const topic = message.is_topic_message ? message.message_thread_id : undefined;
      await api.sendMessage(message.chat.id, idText(message.chat.id, message.from?.id, topic), {
        replyTo: message.message_id,
        ...(topic !== undefined && { threadId: topic }),
      });
      return true;
    }
    if (command === 'start' && message.chat.type === 'private') {
      await api.sendMessage(message.chat.id, START_TEXT);
      return true;
    }
    return false;
  }
}
