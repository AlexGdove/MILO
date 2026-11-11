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
import { EmailRejectedError, EmailSender } from './email-sender.js';
import { hashPassword, verifyPassword } from './password.js';
import { AppException } from '../../common/errors/app.exception.js';
import type { CodePurpose, Plan, Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisRateLimitStorage } from '../rate-limit/rate-limit.storage.js';

/** Писем с кодом на одну почту: не больше 3 за 15 минут и 10 в сутки */
export const EMAIL_CODE_LIMITS = [
  { name: 'authEmail15m', limit: 3, ttl: 15 * 60_000 },
  { name: 'authEmailDay', limit: 10, ttl: 24 * 60 * 60_000 },
] as const;

/** Попыток входа в одну почту (с любых IP): не больше 20 в час — подбор пароля */
export const LOGIN_EMAIL_LIMIT = { name: 'authLoginEmail', limit: 20, ttl: 60 * 60_000 } as const;

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

export interface CodeSent {
  expiresInSeconds: number;
}

type Tx = Prisma.TransactionClient;
type AccountRow = { id: string; email: string; plan: Plan; planUntil: Date | null };

const fail = (status: HttpStatus, code: string, message: string) =>
  new AppException(status, code, message);
const INVALID_CODE = () => fail(HttpStatus.UNAUTHORIZED, 'code_invalid', 'Code is invalid');
const INVALID_CREDENTIALS = () =>
  fail(HttpStatus.UNAUTHORIZED, 'invalid_credentials', 'Email or password is incorrect');
const BLOCKED = () => fail(HttpStatus.FORBIDDEN, 'account_blocked', 'Account is blocked');

/**
 * Аккаунты (решения №60, №68, №69): регистрация почтой и паролем с подтверждением почты кодом,
 * вход паролем, сброс пароля кодом, сессии. Хранятся только хэш пароля (scrypt), HMAC кодов и
 * SHA-256 токенов. Ответы на запрос кода не зависят от того, есть ли аккаунт с этой почтой;
 * ответ на неверный пароль одинаков для существующей и несуществующей почты (и по времени).
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly config: AuthConfig;
  /** Хэш-пустышка: проверка пароля несуществующей почты занимает столько же времени */
  private readonly dummyHash: Promise<string>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailSender,
    private readonly rateLimits: RedisRateLimitStorage,
    config: ConfigService,
  ) {
    this.config = getAuthConfig(config);
    this.dummyHash = hashPassword('milo-timing-dummy-password');
  }

  /**
   * Регистрация: аккаунт без подтверждения и код на почту. Повтор для неподтверждённой почты
   * меняет пароль и шлёт новый код (код придёт владельцу ящика); подтверждённая — `409`.
   */
  async register(rawEmail: string, password: string, now = new Date()): Promise<CodeSent> {
    this.assertEnabled();
    const email = normalizeEmail(rawEmail);
    const existing = await this.prisma.account.findUnique({ where: { email } });
    if (existing?.emailVerifiedAt) {
      throw fail(HttpStatus.CONFLICT, 'email_taken', 'Email is already registered');
    }
    await this.limitEmail(email);
    const passwordHash = await hashPassword(password);
    await this.prisma.account.upsert({
      where: { email },
      create: { email, passwordHash },
      update: { passwordHash },
    });
    return this.issueCode(email, 'verify_email', now);
  }

  /** Повторный код подтверждения; ответ одинаковый, есть такая почта или нет. */
  async resendVerification(rawEmail: string, now = new Date()): Promise<CodeSent> {
    this.assertEnabled();
    const email = normalizeEmail(rawEmail);
    const account = await this.prisma.account.findUnique({ where: { email } });
    if (!account || account.emailVerifiedAt) return codeSent();
    await this.limitEmail(email);
    return this.issueCode(email, 'verify_email', now);
  }

  /** Код подтверждения → почта подтверждена и сразу вход. */
  async verifyEmail(rawEmail: string, code: string, now = new Date()): Promise<IssuedSession> {
    this.assertEnabled();
    const email = normalizeEmail(rawEmail);
    const codeId = await this.checkCode(email, 'verify_email', code, now);
    return this.prisma.$transaction(async (tx) => {
      await this.consumeCode(tx, codeId, now);
      const account = await tx.account.findUnique({ where: { email } });
      if (!account) throw INVALID_CODE();
      if (account.blockedAt) throw BLOCKED();
      const verified = await tx.account.update({
        where: { id: account.id },
        data: { emailVerifiedAt: account.emailVerifiedAt ?? now, lastLoginAt: now },
      });
      return this.openSession(tx, verified, now);
    });
  }

  /** Вход паролем. Заблокирован / не подтверждён — сообщается только при верном пароле. */
  async login(rawEmail: string, password: string, now = new Date()): Promise<IssuedSession> {
    const email = normalizeEmail(rawEmail);
    await this.limit(`${LOGIN_EMAIL_LIMIT.name}:${hashEmail(email)}`, LOGIN_EMAIL_LIMIT);
    const account = await this.prisma.account.findUnique({ where: { email } });
    if (!account) {
      await verifyPassword(password, await this.dummyHash);
      throw INVALID_CREDENTIALS();
    }
    if (!(await verifyPassword(password, account.passwordHash))) throw INVALID_CREDENTIALS();
    if (account.blockedAt) throw BLOCKED();
    if (!account.emailVerifiedAt) {
      throw fail(HttpStatus.FORBIDDEN, 'email_not_verified', 'Email is not verified');
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.account.update({
        where: { id: account.id },
        data: { lastLoginAt: now },
      });
      return this.openSession(tx, updated, now);
    });
  }

  /** «Забыли пароль»: код сброса на подтверждённую почту; ответ одинаковый для любой почты. */
  async forgotPassword(rawEmail: string, now = new Date()): Promise<CodeSent> {
    this.assertEnabled();
    const email = normalizeEmail(rawEmail);
    const account = await this.prisma.account.findUnique({ where: { email } });
    if (!account?.emailVerifiedAt || account.blockedAt) return codeSent();
    await this.limitEmail(email);
    return this.issueCode(email, 'reset_password', now);
  }

  /** Код сброса → новый пароль; все прежние сессии закрываются, открывается новая. */
  async resetPassword(
    rawEmail: string,
    code: string,
    password: string,
    now = new Date(),
  ): Promise<IssuedSession> {
    this.assertEnabled();
    const email = normalizeEmail(rawEmail);
    const codeId = await this.checkCode(email, 'reset_password', code, now);
    const passwordHash = await hashPassword(password);
    return this.prisma.$transaction(async (tx) => {
      await this.consumeCode(tx, codeId, now);
      const account = await tx.account.findUnique({ where: { email } });
      if (!account) throw INVALID_CODE();
      if (account.blockedAt) throw BLOCKED();
      await tx.session.updateMany({
        where: { accountId: account.id, revokedAt: null },
        data: { revokedAt: now },
      });
      const updated = await tx.account.update({
        where: { id: account.id },
        data: { passwordHash, lastLoginAt: now },
      });
      return this.openSession(tx, updated, now);
    });
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
      throw fail(HttpStatus.UNAUTHORIZED, 'session_invalid', 'Session is invalid');
    }
    return toView(account);
  }

  async logout(sessionId: string, now = new Date()): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: now },
    });
  }

  /** Удаляет аккаунт, все его сессии (каскад) и коды его почты. */
  async deleteAccount(accountId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const account = await tx.account.findUnique({ where: { id: accountId } });
      if (!account) return;
      await tx.loginCode.deleteMany({ where: { email: account.email } });
      await tx.account.delete({ where: { id: accountId } });
    });
  }

  /** Новый код назначения `purpose`; прежние неиспользованные коды того же назначения гаснут. */
  private async issueCode(email: string, purpose: CodePurpose, now: Date): Promise<CodeSent> {
    const code = generateLoginCode();
    await this.prisma.$transaction([
      this.prisma.loginCode.updateMany({
        where: { email, purpose, consumedAt: null },
        data: { consumedAt: now },
      }),
      this.prisma.loginCode.create({
        data: {
          email,
          purpose,
          codeHash: hashLoginCode(email, code, this.config.codeSecret),
          expiresAt: new Date(now.getTime() + LOGIN_CODE_TTL_MS),
        },
      }),
    ]);
    try {
      await this.email.sendCode(email, code, purpose);
    } catch (error) {
      if (error instanceof EmailRejectedError) {
        throw fail(
          HttpStatus.UNPROCESSABLE_ENTITY,
          'email_rejected',
          'This email address does not accept mail',
        );
      }
      // Причина — в логе отправителя; клиенту — понятный ответ «попробуйте позже»
      throw fail(
        HttpStatus.SERVICE_UNAVAILABLE,
        'email_unavailable',
        'Email could not be sent, try again later',
      );
    }
    return codeSent();
  }

  /**
   * Проверка кода → его id (ещё не погашен). Попытка учитывается до сравнения атомарно —
   * параллельные запросы не дают больше 5 попыток; после 5-й неверной код сгорает.
   */
  private async checkCode(
    email: string,
    purpose: CodePurpose,
    code: string,
    now: Date,
  ): Promise<string> {
    if (!LOGIN_CODE_PATTERN.test(code)) throw INVALID_CODE();
    const current = await this.prisma.loginCode.findFirst({
      where: { email, purpose, consumedAt: null, expiresAt: { gt: now } },
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
    return current.id;
  }

  /** Код одноразовый: из двух одновременных верных запросов пройдёт один. */
  private async consumeCode(tx: Tx, codeId: string, now: Date): Promise<void> {
    const consumed = await tx.loginCode.updateMany({
      where: { id: codeId, consumedAt: null },
      data: { consumedAt: now },
    });
    if (consumed.count === 0) throw INVALID_CODE();
  }

  private async openSession(tx: Tx, account: AccountRow, now: Date): Promise<IssuedSession> {
    const token = generateSessionToken();
    await tx.session.create({
      data: {
        accountId: account.id,
        tokenHash: hashSessionToken(token),
        lastSeenAt: now,
        expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
      },
    });
    return { token, account: toView(account) };
  }

  private assertEnabled(): void {
    if (!this.config.enabled) {
      throw fail(
        HttpStatus.SERVICE_UNAVAILABLE,
        'auth_unavailable',
        'Sign-up and email codes are temporarily unavailable',
      );
    }
  }

  /** Лимит писем на почту; в ключе Redis — хэш почты, а не сама почта. */
  private async limitEmail(email: string): Promise<void> {
    for (const policy of EMAIL_CODE_LIMITS) {
      await this.limit(`${policy.name}:${hashEmail(email)}`, policy);
    }
  }

  private async limit(key: string, policy: { limit: number; ttl: number }): Promise<void> {
    let blocked: boolean;
    try {
      ({ blocked } = await this.rateLimits.hit(key, policy.ttl, policy.limit));
    } catch (error) {
      this.logger.error(
        { err: error instanceof Error ? { message: error.message } : error },
        'Rate limit storage is unavailable',
      );
      throw fail(
        HttpStatus.SERVICE_UNAVAILABLE,
        'service_unavailable',
        'Service is temporarily unavailable',
      );
    }
    if (blocked) throw fail(HttpStatus.TOO_MANY_REQUESTS, 'rate_limited', 'Too many requests');
  }
}

const hashEmail = (email: string) => createHash('sha256').update(email).digest('hex');
const codeSent = (): CodeSent => ({ expiresInSeconds: LOGIN_CODE_TTL_MS / 1000 });

function toView(account: AccountRow): AccountView {
  return {
    id: account.id,
    email: account.email,
    plan: account.plan,
    planUntil: account.planUntil?.toISOString() ?? null,
  };
}
