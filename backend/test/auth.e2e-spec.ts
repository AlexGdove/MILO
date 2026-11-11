import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module.js';
import { APP_OPTIONS, configureApp } from '../src/app.setup.js';
import { resetData } from './support/db.js';
import { resetRedis } from './support/redis.js';
import type { CodePurpose } from '../src/generated/prisma/client.js';
import { hashSessionToken } from '../src/modules/auth/auth-crypto.js';
import {
  LOGIN_CODE_MAX_ATTEMPTS,
  SESSION_TOUCH_INTERVAL_MS,
  SESSION_TTL_MS,
} from '../src/modules/auth/auth.config.js';
import {
  AuthService,
  EMAIL_CODE_LIMITS,
  LOGIN_EMAIL_LIMIT,
} from '../src/modules/auth/auth.service.js';
import { EmailRejectedError, EmailSender } from '../src/modules/auth/email-sender.js';
import { CleanupService } from '../src/modules/maintenance/cleanup.service.js';
import { RATE_LIMIT_POLICIES } from '../src/modules/rate-limit/rate-limit.policies.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { RedisService } from '../src/redis/redis.service.js';

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/** Письма вместо почтового сервиса: последний код на каждую почту и назначение. */
class FakeEmailSender extends EmailSender {
  readonly sent: Array<{ email: string; code: string; purpose: CodePurpose }> = [];
  /** Почтовый сервер недоступен / адрес не принимает почту */
  failing: false | 'down' | 'rejected' = false;
  sendCode(email: string, code: string, purpose: CodePurpose): Promise<void> {
    if (this.failing === 'down') return Promise.reject(new Error('SMTP down'));
    if (this.failing === 'rejected') return Promise.reject(new EmailRejectedError());
    this.sent.push({ email, code, purpose });
    return Promise.resolve();
  }
  last(email: string, purpose: CodePurpose): string {
    const found = this.sent.filter((m) => m.email === email && m.purpose === purpose).at(-1);
    if (!found) throw new Error(`Нет письма ${purpose} для ${email}`);
    return found.code;
  }
}

const EMAIL = 'anna@example.com';
const PASSWORD = 'correct horse battery';

/** Аккаунты (№69): регистрация, подтверждение почты, вход паролем, сброс, сессии. */
describe('Аккаунты (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  const mail = new FakeEmailSender();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(EmailSender)
      .useValue(mail)
      .compile();
    app = moduleRef.createNestApplication<NestExpressApplication>(APP_OPTIONS);
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    mail.sent.length = 0;
    mail.failing = false;
    await resetData(prisma);
    await resetRedis(app.get(RedisService));
  });

  const server = () => app.getHttpServer();
  const post = (path: string, body: Json) =>
    request(server()).post(`/api/v1/auth/${path}`).send(body);
  const me = (token?: string) => {
    const req = request(server()).get('/api/v1/account/me');
    return token === undefined ? req : req.set('Authorization', `Bearer ${token}`);
  };
  const wrong = (code: string) => (code === '000000' ? '000001' : '000000');
  /** Регистрация с подтверждением → сессия */
  const signUp = async (email = EMAIL, password = PASSWORD): Promise<Json> => {
    await post('register', { email, password }).expect(202);
    const code = mail.last(email.trim().toLowerCase(), 'verify_email');
    return (await post('register/verify', { email, code }).expect(200)).body as Json;
  };
  const login = (email = EMAIL, password = PASSWORD) => post('login', { email, password });

  describe('регистрация и подтверждение почты', () => {
    it('регистрация → код → почта подтверждена, сразу вход с тарифом free', async () => {
      const res = await post('register', { email: 'Anna@Example.com', password: PASSWORD });
      expect(res.status).toBe(202);
      expect(res.body).toEqual({ expiresInSeconds: 600 });
      expect(mail.sent).toEqual([
        { email: EMAIL, code: expect.stringMatching(/^\d{6}$/), purpose: 'verify_email' },
      ]);

      const session = (
        await post('register/verify', {
          email: EMAIL,
          code: mail.last(EMAIL, 'verify_email'),
        }).expect(200)
      ).body as Json;
      expect(session.token).toMatch(/^ms_[A-Za-z0-9_-]{43}$/);
      expect(session.account).toMatchObject({ email: EMAIL, plan: 'free', planUntil: null });
      expect((await me(session.token as string).expect(200)).body).toEqual(session.account);
      expect((await prisma.account.findFirstOrThrow()).emailVerifiedAt).not.toBeNull();
    });

    it('без подтверждения войти нельзя (только при верном пароле видно почему)', async () => {
      await post('register', { email: EMAIL, password: PASSWORD }).expect(202);
      const res = await login().expect(403);
      expect(res.body.error.code).toBe('email_not_verified');
      expect((await login(EMAIL, 'wrong password').expect(401)).body.error.code).toBe(
        'invalid_credentials',
      );
    });

    it('подтверждённая почта занята → 409 email_taken', async () => {
      await signUp();
      const res = await post('register', { email: EMAIL, password: 'another password' });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('email_taken');
      await login().expect(200);
    });

    it('повторная регистрация неподтверждённой почты меняет пароль и шлёт новый код', async () => {
      await post('register', { email: EMAIL, password: 'first password' }).expect(202);
      const first = mail.last(EMAIL, 'verify_email');
      await post('register', { email: EMAIL, password: PASSWORD }).expect(202);
      const second = mail.last(EMAIL, 'verify_email');
      if (first !== second)
        await post('register/verify', { email: EMAIL, code: first }).expect(401);
      await post('register/verify', { email: EMAIL, code: second }).expect(200);
      await login(EMAIL, 'first password').expect(401);
      await login().expect(200);
    });

    it('повторный код: для неподтверждённой почты — новое письмо, для чужой — тот же ответ без письма', async () => {
      await post('register', { email: EMAIL, password: PASSWORD }).expect(202);
      await post('register/resend', { email: EMAIL }).expect(202);
      expect(mail.sent).toHaveLength(2);

      const unknown = await post('register/resend', { email: 'nobody@example.com' }).expect(202);
      expect(unknown.body).toEqual({ expiresInSeconds: 600 });
      expect(mail.sent).toHaveLength(2);
    });

    it('код одноразовый', async () => {
      await post('register', { email: EMAIL, password: PASSWORD }).expect(202);
      const code = mail.last(EMAIL, 'verify_email');
      await post('register/verify', { email: EMAIL, code }).expect(200);
      const again = await post('register/verify', { email: EMAIL, code }).expect(401);
      expect(again.body.error.code).toBe('code_invalid');
    });

    it(`после ${LOGIN_CODE_MAX_ATTEMPTS} неверных попыток код сгорает`, async () => {
      await post('register', { email: EMAIL, password: PASSWORD }).expect(202);
      const code = mail.last(EMAIL, 'verify_email');
      for (let i = 0; i < LOGIN_CODE_MAX_ATTEMPTS; i++) {
        await post('register/verify', { email: EMAIL, code: wrong(code) }).expect(401);
      }
      await post('register/verify', { email: EMAIL, code }).expect(401);
      expect((await prisma.account.findFirstOrThrow()).emailVerifiedAt).toBeNull();
    });

    it('параллельный перебор не даёт больше попыток, чем положено', async () => {
      await post('register', { email: EMAIL, password: PASSWORD }).expect(202);
      const code = mail.last(EMAIL, 'verify_email');
      await Promise.all(
        Array.from({ length: 12 }, () =>
          post('register/verify', { email: EMAIL, code: wrong(code) }),
        ),
      );
      expect((await prisma.loginCode.findFirstOrThrow()).attempts).toBeLessThanOrEqual(
        LOGIN_CODE_MAX_ATTEMPTS,
      );
      await post('register/verify', { email: EMAIL, code }).expect(401);
    });

    it('истёкший код не принимается', async () => {
      await post('register', { email: EMAIL, password: PASSWORD }).expect(202);
      await prisma.loginCode.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
      await post('register/verify', {
        email: EMAIL,
        code: mail.last(EMAIL, 'verify_email'),
      }).expect(401);
    });

    it('в базе нет ни пароля, ни кода, ни токена в открытом виде', async () => {
      const { token } = await signUp();
      const account = await prisma.account.findFirstOrThrow();
      expect(account.passwordHash).toMatch(/^scrypt\$/);
      expect(account.passwordHash).not.toContain(PASSWORD);
      const code = mail.last(EMAIL, 'verify_email');
      expect((await prisma.loginCode.findFirstOrThrow()).codeHash).not.toContain(code);
      expect((await prisma.session.findFirstOrThrow()).tokenHash).toBe(
        hashSessionToken(token as string),
      );
    });

    it.each([
      ['не почта', { email: 'anna', password: PASSWORD }],
      ['пароль короче 8', { email: EMAIL, password: '1234567' }],
      ['пароль длиннее 128', { email: EMAIL, password: 'a'.repeat(129) }],
      ['пароль из пробелов', { email: EMAIL, password: '         ' }],
      ['лишнее поле', { email: EMAIL, password: PASSWORD, plan: 'unlimited' }],
    ])('%s → 400 validation_failed', async (_name, body) => {
      const res = await post('register', body).expect(400);
      expect(res.body.error.code).toBe('validation_failed');
      expect(await prisma.account.count()).toBe(0);
    });
  });

  describe('вход паролем', () => {
    it('верный пароль → новая сессия; почта без учёта регистра', async () => {
      const first = await signUp();
      const res = await login('ANNA@example.com').expect(200);
      expect(res.body.account.id).toBe(first.account.id);
      expect(res.body.token).not.toBe(first.token);
    });

    it('неверный пароль и несуществующая почта — одинаковый ответ', async () => {
      await signUp();
      const wrongPassword = await login(EMAIL, 'wrong password').expect(401);
      const noAccount = await login('nobody@example.com').expect(401);
      expect(wrongPassword.body.error.code).toBe('invalid_credentials');
      expect(noAccount.body.error.code).toBe('invalid_credentials');
      expect(wrongPassword.body.error.message).toBe(noAccount.body.error.message);
    });

    it('пароль чувствителен к регистру и пробелам', async () => {
      await signUp();
      await login(EMAIL, PASSWORD.toUpperCase()).expect(401);
      await login(EMAIL, ` ${PASSWORD}`).expect(401);
    });

    it('заблокированный аккаунт не входит', async () => {
      await signUp();
      await prisma.account.updateMany({ data: { blockedAt: new Date() } });
      expect((await login().expect(403)).body.error.code).toBe('account_blocked');
    });

    it(`не больше ${LOGIN_EMAIL_LIMIT.limit} попыток в час на одну почту`, async () => {
      await signUp();
      // Напрямую через сервис — мимо лимита по IP: проверяется именно лимит по почте
      const auth = app.get(AuthService);
      for (let i = 0; i < LOGIN_EMAIL_LIMIT.limit; i++) {
        await expect(auth.login(EMAIL, 'wrong password')).rejects.toMatchObject({
          code: 'invalid_credentials',
        });
      }
      await expect(auth.login(EMAIL, PASSWORD)).rejects.toMatchObject({ code: 'rate_limited' });
      // Другая почта не задета
      await expect(auth.login('nobody@example.com', PASSWORD)).rejects.toMatchObject({
        code: 'invalid_credentials',
      });
    });
  });

  describe('сброс пароля', () => {
    it('код сброса → новый пароль, все старые сессии закрыты, выдана новая', async () => {
      const old = await signUp();
      const other = (await login().expect(200)).body as Json;

      await post('password/forgot', { email: EMAIL }).expect(202);
      const code = mail.last(EMAIL, 'reset_password');
      const res = await post('password/reset', {
        email: EMAIL,
        code,
        password: 'new strong password',
      }).expect(200);

      await me(old.token as string).expect(401);
      await me(other.token as string).expect(401);
      await me(res.body.token as string).expect(200);
      await login().expect(401);
      await login(EMAIL, 'new strong password').expect(200);
    });

    it('«забыли пароль» для неизвестной или неподтверждённой почты — тот же ответ без письма', async () => {
      await post('register', { email: 'boris@example.com', password: PASSWORD }).expect(202);
      const sent = mail.sent.length;
      for (const email of ['nobody@example.com', 'boris@example.com']) {
        const res = await post('password/forgot', { email }).expect(202);
        expect(res.body).toEqual({ expiresInSeconds: 600 });
      }
      expect(mail.sent).toHaveLength(sent);
    });

    it('код подтверждения почты не подходит для сброса пароля', async () => {
      await post('register', { email: EMAIL, password: PASSWORD }).expect(202);
      const verifyCode = mail.last(EMAIL, 'verify_email');
      const res = await post('password/reset', {
        email: EMAIL,
        code: verifyCode,
        password: 'new strong password',
      }).expect(401);
      expect(res.body.error.code).toBe('code_invalid');
    });

    it('код сброса одноразовый и не подходит для подтверждения почты', async () => {
      await signUp();
      await post('password/forgot', { email: EMAIL }).expect(202);
      const code = mail.last(EMAIL, 'reset_password');
      await post('register/verify', { email: EMAIL, code }).expect(401);
      await post('password/reset', { email: EMAIL, code, password: 'new strong password' }).expect(
        200,
      );
      await post('password/reset', { email: EMAIL, code, password: 'third password!' }).expect(401);
    });
  });

  it('почтовый сервер недоступен → 503 email_unavailable', async () => {
    mail.failing = 'down';
    const res = await post('register', { email: EMAIL, password: PASSWORD }).expect(503);
    expect(res.body.error.code).toBe('email_unavailable');
  });

  it('адрес не принимает почту → 422 email_rejected', async () => {
    mail.failing = 'rejected';
    const res = await post('register', { email: EMAIL, password: PASSWORD }).expect(422);
    expect(res.body.error.code).toBe('email_rejected');
  });

  describe('лимиты писем', () => {
    it(`не больше ${EMAIL_CODE_LIMITS[0].limit} писем на одну почту за 15 минут`, async () => {
      for (let i = 0; i < EMAIL_CODE_LIMITS[0].limit; i++) {
        await post('register', { email: EMAIL, password: PASSWORD }).expect(202);
      }
      const res = await post('register', { email: 'ANNA@example.com', password: PASSWORD });
      expect(res.status).toBe(429);
      await post('register', { email: 'boris@example.com', password: PASSWORD }).expect(202);
    });

    it(`регистрация — не больше ${RATE_LIMIT_POLICIES.authRegister.limit} в час с одного IP`, async () => {
      for (let i = 0; i < RATE_LIMIT_POLICIES.authRegister.limit; i++) {
        await post('register', { email: `user${i}@example.com`, password: PASSWORD }).expect(202);
      }
      await post('register', { email: 'last@example.com', password: PASSWORD }).expect(429);
    });
  });

  describe('сессии', () => {
    it.each([
      ['без заголовка', undefined, 'session_required'],
      ['не токен', 'abc', 'session_invalid'],
      ['неизвестный токен', `ms_${'A'.repeat(43)}`, 'session_invalid'],
      ['ключ устройства вместо токена', `mk_${'A'.repeat(43)}`, 'session_invalid'],
    ])('%s → 401 %s', async (_name, token, code) => {
      expect((await me(token).expect(401)).body.error.code).toBe(code);
    });

    it('без «Bearer» → 401 session_invalid', async () => {
      const { token } = await signUp();
      const res = await request(server())
        .get('/api/v1/account/me')
        .set('Authorization', token as string)
        .expect(401);
      expect(res.body.error.code).toBe('session_invalid');
    });

    it('выход закрывает только текущую сессию', async () => {
      const first = await signUp();
      const second = (await login().expect(200)).body as Json;
      await request(server())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${first.token}`)
        .expect(204);
      await me(first.token as string).expect(401);
      await me(second.token as string).expect(200);
    });

    it('истёкшая сессия не действует', async () => {
      const { token } = await signUp();
      await prisma.session.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
      await me(token as string).expect(401);
    });

    it('блокировка аккаунта закрывает доступ по уже выданному токену', async () => {
      const { token } = await signUp();
      await prisma.account.updateMany({ data: { blockedAt: new Date() } });
      await me(token as string).expect(401);
    });

    it('активность продлевает сессию не чаще раза в час', async () => {
      const { token } = await signUp();
      const auth = app.get(AuthService);
      const created = await prisma.session.findFirstOrThrow();

      await auth.resolveSession(token as string, new Date(created.lastSeenAt.getTime() + 60_000));
      expect((await prisma.session.findFirstOrThrow()).expiresAt).toEqual(created.expiresAt);

      const later = new Date(created.lastSeenAt.getTime() + SESSION_TOUCH_INTERVAL_MS);
      await auth.resolveSession(token as string, later);
      expect((await prisma.session.findFirstOrThrow()).expiresAt.getTime()).toBe(
        later.getTime() + SESSION_TTL_MS,
      );
    });
  });

  it('удаление аккаунта: аккаунт, все сессии и коды его почты', async () => {
    const first = await signUp();
    await login().expect(200);
    await post('password/forgot', { email: EMAIL }).expect(202);
    await signUp('boris@example.com');

    await request(server())
      .delete('/api/v1/account/me')
      .set('Authorization', `Bearer ${first.token}`)
      .expect(204);

    expect(await prisma.account.findMany({ select: { email: true } })).toEqual([
      { email: 'boris@example.com' },
    ]);
    expect(await prisma.session.count()).toBe(1);
    expect(await prisma.loginCode.count({ where: { email: EMAIL } })).toBe(0);
    await me(first.token as string).expect(401);
    await login().expect(401);
  });

  it('очистка удаляет истёкшие коды и закрытые или истёкшие сессии', async () => {
    const live = await signUp();
    const closed = (await login().expect(200)).body as Json;
    await request(server())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${closed.token}`)
      .expect(204);
    await post('register', { email: 'boris@example.com', password: PASSWORD }).expect(202);

    const result = await app.get(CleanupService).run(new Date(Date.now() + 11 * 60_000));

    expect(result).toMatchObject({ loginCodes: 2, sessions: 1 });
    expect(await prisma.loginCode.count()).toBe(0);
    await me(live.token as string).expect(200);
  });
});
