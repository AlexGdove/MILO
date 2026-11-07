import { getTelegramConfig } from './telegram.config.js';
import { validateEnv } from '../../config/env.validation.js';

const DB = {
  DATABASE_URL: 'postgresql://milo:milo@localhost:5432/milo',
  REDIS_URL: 'redis://localhost:6379/0',
};
const TOKEN = '1234567890:AAEexampleexampleexampleexample_-12';
const fromEnv = (env: Record<string, string>) => ({ get: (key: string) => env[key] });

describe('getTelegramConfig', () => {
  it('без токенов ботов нет', () => {
    expect(getTelegramConfig(fromEnv({}))).toEqual({ support: null, moderation: null });
  });

  it('токен и чат: номер чата — число', () => {
    expect(
      getTelegramConfig(
        fromEnv({ TELEGRAM_SUPPORT_BOT_TOKEN: TOKEN, TELEGRAM_SUPPORT_CHAT_ID: '-1001234567890' }),
      ),
    ).toEqual({
      support: { token: TOKEN, chatId: -1001234567890, threadId: null },
      moderation: null,
    });
  });

  it('токен без чата — бот только для /id', () => {
    expect(getTelegramConfig(fromEnv({ TELEGRAM_MODERATION_BOT_TOKEN: TOKEN })).moderation).toEqual(
      { token: TOKEN, chatId: null, threadId: null },
    );
  });
});

describe('getTelegramConfig: группа с темами', () => {
  it('оба бота в одной группе, у каждого своя тема', () => {
    const config = getTelegramConfig(
      fromEnv({
        TELEGRAM_SUPPORT_BOT_TOKEN: TOKEN,
        TELEGRAM_SUPPORT_CHAT_ID: '-100500',
        TELEGRAM_SUPPORT_THREAD_ID: '77',
        TELEGRAM_MODERATION_BOT_TOKEN: TOKEN,
        TELEGRAM_MODERATION_CHAT_ID: '-100500',
        TELEGRAM_MODERATION_THREAD_ID: '88',
      }),
    );
    expect(config.support).toEqual({ token: TOKEN, chatId: -100500, threadId: 77 });
    expect(config.moderation).toEqual({ token: TOKEN, chatId: -100500, threadId: 88 });
  });

  it.each(['0', '-5', 'abc', '1.5'])('validateEnv отклоняет тему %p', (thread) => {
    expect(() => validateEnv({ ...DB, TELEGRAM_SUPPORT_THREAD_ID: thread })).toThrow(
      /TELEGRAM_SUPPORT_THREAD_ID/,
    );
  });
});

describe('validateEnv: Telegram', () => {
  it('принимает верные токен и чат', () => {
    expect(() =>
      validateEnv({
        ...DB,
        TELEGRAM_SUPPORT_BOT_TOKEN: TOKEN,
        TELEGRAM_SUPPORT_CHAT_ID: '-100123',
      }),
    ).not.toThrow();
  });

  it.each(['abc', '123:short', 'bot1234567890:AAEexampleexampleexampleexample_-12'])(
    'отклоняет токен %p',
    (token) => {
      expect(() => validateEnv({ ...DB, TELEGRAM_MODERATION_BOT_TOKEN: token })).toThrow(
        /TELEGRAM_MODERATION_BOT_TOKEN/,
      );
    },
  );

  it('пустые значения — как не заданные: сервер стартует без ботов', () => {
    const env = validateEnv({
      ...DB,
      TELEGRAM_SUPPORT_BOT_TOKEN: '',
      TELEGRAM_SUPPORT_CHAT_ID: '',
      TELEGRAM_MODERATION_BOT_TOKEN: '',
      TELEGRAM_MODERATION_CHAT_ID: '',
    });
    expect(getTelegramConfig({ get: (key: string) => env[key as keyof typeof env] })).toEqual({
      support: null,
      moderation: null,
    });
  });

  it('пустой DATABASE_URL — ошибка, как и отсутствующий', () => {
    expect(() => validateEnv({ ...DB, DATABASE_URL: '' })).toThrow(/DATABASE_URL/);
  });

  it('текст ошибки не содержит сам токен', () => {
    const bad = TOKEN + '!';
    let message = '';
    try {
      validateEnv({ ...DB, TELEGRAM_SUPPORT_BOT_TOKEN: bad });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain('TELEGRAM_SUPPORT_BOT_TOKEN');
    expect(message).not.toContain(bad);
  });

  it.each(['chat', '12.5', '@group'])('отклоняет чат %p', (chat) => {
    expect(() => validateEnv({ ...DB, TELEGRAM_SUPPORT_CHAT_ID: chat })).toThrow(
      /TELEGRAM_SUPPORT_CHAT_ID/,
    );
  });
});
