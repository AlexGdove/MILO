import { randomBytes } from 'node:crypto';

import type { ConfigService } from '@nestjs/config';

import type { EmailTransport, NodeEnv } from '../../config/env.validation.js';

/** Срок кода входа */
export const LOGIN_CODE_TTL_MS = 10 * 60_000;
/** Неверных попыток ввода одного кода, после которых он сгорает */
export const LOGIN_CODE_MAX_ATTEMPTS = 5;
/** Срок сессии (решение владельца 2026-11-11): продлевается при активности */
export const SESSION_TTL_MS = 90 * 24 * 60 * 60_000;
/** Продление сессии и `last_seen_at` — не чаще раза в час, без записи на каждый запрос */
export const SESSION_TOUCH_INTERVAL_MS = 60 * 60_000;

export interface AuthConfig {
  /** Вход по почте работает: есть секрет кодов и способ отправки писем */
  enabled: boolean;
  codeSecret: string;
  transport: EmailTransport | null;
}

interface AuthEnv {
  NODE_ENV: NodeEnv;
  AUTH_CODE_SECRET?: string;
  EMAIL_TRANSPORT?: EmailTransport;
}

/**
 * Настройки входа. Production: нужны и `AUTH_CODE_SECRET`, и `EMAIL_TRANSPORT`, иначе вход
 * выключен. Вне production недостающее подставляется: случайный секрет и отправка в лог.
 */
export function toAuthConfig(env: AuthEnv): AuthConfig {
  if (env.NODE_ENV === 'production') {
    const codeSecret = env.AUTH_CODE_SECRET ?? '';
    const transport = env.EMAIL_TRANSPORT ?? null;
    return { enabled: codeSecret !== '' && transport !== null, codeSecret, transport };
  }
  return {
    enabled: true,
    codeSecret: env.AUTH_CODE_SECRET ?? randomBytes(32).toString('base64url'),
    transport: env.EMAIL_TRANSPORT ?? 'log',
  };
}

export function getAuthConfig(config: ConfigService): AuthConfig {
  return toAuthConfig({
    NODE_ENV: config.getOrThrow('NODE_ENV'),
    AUTH_CODE_SECRET: config.get('AUTH_CODE_SECRET'),
    EMAIL_TRANSPORT: config.get('EMAIL_TRANSPORT'),
  });
}
