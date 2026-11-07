import type {
  BotApi,
  InlineButton,
  SendOptions,
  Update,
} from '../../src/modules/telegram/bot-api.js';

export interface SentMessage {
  chatId: number;
  messageId: number;
  text: string;
  options: SendOptions;
}

/** Заглушка Bot API: записывает вызовы, номера сообщений — по порядку с 1000. */
export class FakeBotApi implements BotApi {
  readonly sent: SentMessage[] = [];
  readonly edited: {
    chatId: number;
    messageId: number;
    text: string;
    buttons?: InlineButton[][];
  }[] = [];
  readonly answers: { id: string; text?: string; alert: boolean }[] = [];
  readonly reactions: { chatId: number; messageId: number }[] = [];
  /** Следующая отправка бросит эту ошибку (сбой Telegram или сети) */
  failNextSend: Error | null = null;
  private nextId = 1000;

  sendMessage(chatId: number, text: string, options: SendOptions = {}) {
    if (this.failNextSend) {
      const error = this.failNextSend;
      this.failNextSend = null;
      return Promise.reject(error);
    }
    const messageId = this.nextId++;
    this.sent.push({ chatId, messageId, text, options });
    return Promise.resolve({ messageId });
  }

  editMessage(chatId: number, messageId: number, text: string, buttons?: InlineButton[][]) {
    this.edited.push({ chatId, messageId, text, ...(buttons && { buttons }) });
    return Promise.resolve();
  }

  answerCallback(id: string, text?: string, alert = false) {
    this.answers.push({ id, ...(text !== undefined && { text }), alert });
    return Promise.resolve();
  }

  react(chatId: number, messageId: number) {
    this.reactions.push({ chatId, messageId });
    return Promise.resolve();
  }

  getUpdates(): Promise<Update[]> {
    return Promise.resolve([]);
  }

  reset(): void {
    this.sent.length = 0;
    this.edited.length = 0;
    this.answers.length = 0;
    this.reactions.length = 0;
    this.failNextSend = null;
  }
}
