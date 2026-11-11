import { createHash } from 'node:crypto';

import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  generateLoginCode,
  generateSessionToken,
  hashLoginCode,
  hashSessionToken,
  isSessionTokenFormat,
  LOGIN_CODE_PATTERN,
  normalizeEmail,
  safeEqualHex,
} from './auth-crypto.js';
import {
  type AuthConfig,
  getAuthConfig,
  LOGIN_CODE_MAX_ATTEMPTS,
  LOGIN_CODE_TTL_MS,
  SESSION_TOUCH_INTERVAL_MS,
  SESSION_TTL_MS,
} from './auth.config.js';
import { EmailSender } from './email-sender.js';
import { AppException } from '../../common/errors/app.exception.js';
import type { Plan } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisRateLimitStorage } from '../rate-limit/rate-limit.storage.js';

/** Писем с кодом на одну почту: не больше 3 за 15 минут и 10 в сутки */
export const EMAIL_CODE_LIMITS = [
  { name: 'authEmail15m', limit: 3, ttl: 15 * 60_000 },
  { name: 'authEmailDay', limit: 10, ttl: 24 * 60 * 60_000 },
] as const;

export interface AccountView {
  id: string;
  email: string;
  plan: Plan;
  planUntil: string | null;
}

export interface SessionIdentity {
  accountId: string;
  sessionId: string;
}

export interface IssuedSession {
  token: string;
  account: AccountView;
}

const INVALID_CODE = () =>
  new AppException(HttpStatus.UNAUTHORIZED, 'login_code_invalid', 'Login code is invalid');

/**
 * Вход по одноразовому коду на почту и сессии (решения №60, №68). Хранятся только HMAC кода и
 * SHA-256 токена. Ответ на запрос кода не зависит от того, есть ли аккаунт с этой почтой.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly config: AuthConfig;

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailSender,
    private readonly rateLimits: RedisRateLimitStorage,
    config: ConfigService,
  ) {
    this.config = getAuthConfig(config);
  }

  /** Новый код на почту; прежние неиспользованные коды этой почты гаснут. */
  async startEmailLogin(rawEmail: string, now = new Date()): Promise<{ expiresInSeconds: number }> {
    this.assertEnabled();
    const email = normalizeEmail(rawEmail);
    await this.limitEmail(email);

    const code = generateLoginCode();
    await this.prisma.$transaction([
      this.prisma.loginCode.updateMany({
        where: { email, consumedAt: null },
        data: { consumedAt: now },
      }),
      this.prisma.loginCode.create({
        data: {
          email,
          codeHash: hashLoginCode(email, code, this.config.codeSecret),
          expiresAt: new Date(now.getTime() + LOGIN_CODE_TTL_MS),
        },
      }),
    ]);
    await this.email.sendLoginCode(email, code);
    return { expiresInSeconds: LOGIN_CODE_TTL_MS / 1000 };
  }

  /**
   * Проверка кода → сессия. Аккаунт создаётся при первом входе. Попытка учитывается до
   * сравнения (атомарно), поэтому параллельные запросы не дают больше 5 попыток на код.
   */
  async verifyEmailLogin(rawEmail: string, code: string, now = new Date()): Promise<IssuedSession> {
    this.assertEnabled();
    const email = normalizeEmail(rawEmail);
    if (!LOGIN_CODE_PATTERN.test(code)) throw INVALID_CODE();

    const current = await this.prisma.loginCode.findFirst({
      where: { email, consumedAt: null, expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
    });
    if (!current) throw INVALID_CODE();

    const attempt = await this.prisma.loginCode.updateMany({
      where: { id: current.id, consumedAt: null, attempts: { lt: LOGIN_CODE_MAX_ATTEMPTS } },
      data: { attempts: { increment: 1 } },
    });
    if (attempt.count === 0) throw INVALID_CODE();

    const expected = hashLoginCode(email, code, this.config.codeSecret);
    if (!safeEqualHex(expected, current.codeHash)) {
      if (current.attempts + 1 >= LOGIN_CODE_MAX_ATTEMPTS) {
        await this.prisma.loginCode.updateMany({
          where: { id: current.id, consumedAt: null },
          data: { consumedAt: now },
        });
      }
      throw INVALID_CODE();
    }

    const token = generateSessionToken();
    const account = await this.prisma.$transaction(async (tx) => {
      // Код одноразовый: из двух одновременных верных запросов сессию получит один
      const consumed = await tx.loginCode.updateMany({
        where: { id: current.id, consumedAt: null },
        data: { consumedAt: now },
      });
      if (consumed.count === 0) throw INVALID_CODE();

      const found = await tx.account.upsert({
        where: { email },
        create: { email, lastLoginAt: now },
        update: { lastLoginAt: now },
      });
      if (found.blockedAt) {
        throw new AppException(HttpStatus.FORBIDDEN, 'account_blocked', 'Account is blocked');
      }
      await tx.session.create({
        data: {
          accountId: found.id,
          tokenHash: hashSessionToken(token),
          lastSeenAt: now,
          expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
        },
      });
      return found;
    });
    return { token, account: toView(account) };
  }

  /** Токен из `Authorization` → сессия; срок продлевается не чаще раза в час. */
  async resolveSession(token: string, now = new Date()): Promise<SessionIdentity | null> {
    if (!isSessionTokenFormat(token)) return null;
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: hashSessionToken(token) },
      include: { account: { select: { blockedAt: true } } },
    });
    if (!session || session.revokedAt || session.expiresAt <= now) return null;
    if (session.account.blockedAt) return null;

    if (now.getTime() - session.lastSeenAt.getTime() >= SESSION_TOUCH_INTERVAL_MS) {
      await this.prisma.session.updateMany({
        where: { id: session.id, revokedAt: null },
        data: { lastSeenAt: now, expiresAt: new Date(now.getTime() + SESSION_TTL_MS) },
      });
    }
    return { accountId: session.accountId, sessionId: session.id };
  }

  async getAccount(accountId: string): Promise<AccountView> {
    const account = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!account) {
      throw new AppException(HttpStatus.UNAUTHORIZED, 'session_invalid', 'Session is invalid');
    }
    return toView(account);
  }

  async logout(sessionId: string, now = new Date()): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: now },
    });
  }

  /** Удаляет аккаунт, все его сессии (каскад) и коды входа его почты. */
  async deleteAccount(accountId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const account = await tx.account.findUnique({ where: { id: accountId } });
      if (!account) return;
      await tx.loginCode.deleteMany({ where: { email: account.email } });
      await tx.account.delete({ where: { id: accountId } });
    });
  }

  private assertEnabled(): void {
    if (!this.config.enabled) {
      throw new AppException(
        HttpStatus.SERVICE_UNAVAILABLE,
        'auth_unavailable',
        'Sign-in is temporarily unavailable',
      );
    }
  }

  /** Лимит писем на почту; в ключе Redis — хэш почты, а не сама почта. */
  private async limitEmail(email: string): Promise<void> {
    const emailHash = createHash('sha256').update(email).digest('hex');
    for (const policy of EMAIL_CODE_LIMITS) {
      let blocked: boolean;
      try {
        ({ blocked } = await this.rateLimits.hit(
          `${policy.name}:${emailHash}`,
          policy.ttl,
          policy.limit,
        ));
      } catch (error) {
        this.logger.error(
          { err: error instanceof Error ? { message: error.message } : error },
          'Rate limit storage is unavailable',
        );
        throw new AppException(
          HttpStatus.SERVICE_UNAVAILABLE,
          'service_unavailable',
          'Service is temporarily unavailable',
        );
      }
      if (blocked) {
        throw new AppException(HttpStatus.TOO_MANY_REQUESTS, 'rate_limited', 'Too many requests');
      }
    }
  }
}

function toView(account: {
  id: string;
  email: string;
  plan: Plan;
  planUntil: Date | null;
}): AccountView {
  return {
    id: account.id,
    email: account.email,
    plan: account.plan,
    planUntil: account.planUntil?.toISOString() ?? null,
  };
}
