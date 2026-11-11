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
  /** Для `transport: smtp` (validateEnv гарантирует хост и отправителя) */
  smtp: SmtpConfig | null;
}

export interface SmtpConfig {
  host: string;
  port: number;
  from: string;
}

/** Внутри compose письма принимает почтовый сервер `mail` на порту 587 (решение №70) */
export const DEFAULT_SMTP_PORT = 587;

interface AuthEnv {
  NODE_ENV: NodeEnv;
  AUTH_CODE_SECRET?: string;
  EMAIL_TRANSPORT?: EmailTransport;
  SMTP_HOST?: string;
  SMTP_PORT?: number;
  EMAIL_FROM?: string;
}

const smtpConfig = (env: AuthEnv): SmtpConfig | null =>
  env.EMAIL_TRANSPORT === 'smtp' && env.SMTP_HOST && env.EMAIL_FROM
    ? { host: env.SMTP_HOST, port: env.SMTP_PORT ?? DEFAULT_SMTP_PORT, from: env.EMAIL_FROM }
    : null;

/**
 * Настройки входа. Production: нужны и `AUTH_CODE_SECRET`, и `EMAIL_TRANSPORT`, иначе вход
 * выключен. Вне production недостающее подставляется: случайный секрет и отправка в лог.
 */
export function toAuthConfig(env: AuthEnv): AuthConfig {
  if (env.NODE_ENV === 'production') {
    const codeSecret = env.AUTH_CODE_SECRET ?? '';
    const transport = env.EMAIL_TRANSPORT ?? null;
    return {
      enabled: codeSecret !== '' && transport !== null,
      codeSecret,
      transport,
      smtp: smtpConfig(env),
    };
  }
  return {
    enabled: true,
    codeSecret: env.AUTH_CODE_SECRET ?? randomBytes(32).toString('base64url'),
    transport: env.EMAIL_TRANSPORT ?? 'log',
    smtp: smtpConfig(env),
  };
}

export function getAuthConfig(config: ConfigService): AuthConfig {
  return toAuthConfig({
    NODE_ENV: config.getOrThrow('NODE_ENV'),
    AUTH_CODE_SECRET: config.get('AUTH_CODE_SECRET'),
    EMAIL_TRANSPORT: config.get('EMAIL_TRANSPORT'),
    SMTP_HOST: config.get('SMTP_HOST'),
    SMTP_PORT: config.get('SMTP_PORT'),
    EMAIL_FROM: config.get('EMAIL_FROM'),
  });
}
