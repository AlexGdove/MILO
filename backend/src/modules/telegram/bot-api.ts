import { Api } from 'grammy';
import type { Update } from 'grammy/types';

export type { Update };

/** Кнопка под сообщением: текст и данные, которые Telegram вернёт при нажатии (≤ 64 байт). */
export interface InlineButton {
  text: string;
  data: string;
}

export interface SendOptions {
  /** Ответ (reply) на сообщение этого чата */
  replyTo?: number;
  /** Тема в группе с темами (forum topic) */
  threadId?: number;
  buttons?: InlineButton[][];
}

/**
 * Нужная ботам часть Telegram Bot API. Сервисы зависят только от этого интерфейса —
 * в тестах вместо Telegram подставляется запись вызовов (`FakeBotApi`).
 */
export interface BotApi {
  sendMessage(chatId: number, text: string, options?: SendOptions): Promise<{ messageId: number }>;
  /** Заменить текст и кнопки (без `buttons` кнопки убираются) */
  editMessage(
    chatId: number,
    messageId: number,
    text: string,
    buttons?: InlineButton[][],
  ): Promise<void>;
  /** Ответ на нажатие кнопки: всплывающая подсказка (`alert` — окно с «ОК») */
  answerCallback(callbackQueryId: string, text?: string, alert?: boolean): Promise<void>;
  /** Реакция на сообщение — короткое «сделано» без лишних сообщений в чате */
  react(chatId: number, messageId: number, emoji: '👍'): Promise<void>;
  /** Long polling: ждёт новые обновления до `timeoutSec` секунд */
  getUpdates(offset: number, timeoutSec: number, signal: AbortSignal): Promise<Update[]>;
}

/** Лимит длины сообщения Telegram (символы). */
export const TELEGRAM_TEXT_LIMIT = 4096;

const keyboard = (buttons?: InlineButton[][]) => ({
  inline_keyboard: (buttons ?? []).map((row) =>
    row.map((button) => ({ text: button.text, callback_data: button.data })),
  ),
});

/** Настоящий Bot API через grammY. Тексты — без разметки (parse_mode не задаётся). */
export class GrammyBotApi implements BotApi {
  private readonly api: Api;

  constructor(token: string) {
    this.api = new Api(token);
  }

  async sendMessage(chatId: number, text: string, options: SendOptions = {}) {
    const message = await this.api.sendMessage(chatId, text, {
      ...(options.threadId !== undefined && { message_thread_id: options.threadId }),
      ...(options.replyTo !== undefined && {
        reply_parameters: { message_id: options.replyTo, allow_sending_without_reply: true },
      }),
      ...(options.buttons && { reply_markup: keyboard(options.buttons) }),
      link_preview_options: { is_disabled: true },
    });
    return { messageId: message.message_id };
  }

  async editMessage(chatId: number, messageId: number, text: string, buttons?: InlineButton[][]) {
    await this.api.editMessageText(chatId, messageId, text, {
      reply_markup: keyboard(buttons),
      link_preview_options: { is_disabled: true },
    });
  }

  async answerCallback(callbackQueryId: string, text?: string, alert = false) {
    await this.api.answerCallbackQuery(callbackQueryId, {
      ...(text !== undefined && { text }),
      show_alert: alert,
    });
  }

  async react(chatId: number, messageId: number, emoji: '👍') {
    await this.api.setMessageReaction(chatId, messageId, [{ type: 'emoji', emoji }]);
  }

  getUpdates(offset: number, timeoutSec: number, signal: AbortSignal) {
    return this.api.getUpdates(
      { offset, timeout: timeoutSec, allowed_updates: ['message', 'callback_query'] },
      // grammY описывает AbortSignal своим полифилом — тип другой, объект совместим
      signal as Parameters<Api['getUpdates']>[1],
    );
  }
}
