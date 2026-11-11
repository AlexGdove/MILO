// Тестовые аккаунты для проверки тарифов: почта сразу подтверждена (письмо не нужно).
// Локально из корня: `npm run test-accounts`; на сервере:
// `docker compose -f compose.prod.yaml exec backend node dist/cli/test-accounts.js --production`.
import { randomBytes } from 'node:crypto';

import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/prisma/client.js';
import { hashPassword } from '../modules/auth/password.js';

const TEST_ACCOUNTS = [
  { email: 'test-free@milo-app.ru', plan: 'free', label: 'Бесплатный' },
  { email: 'test-plus@milo-app.ru', plan: 'plus', label: 'MILO+' },
  { email: 'test-pro@milo-app.ru', plan: 'unlimited', label: 'Pro (безлимит)' },
] as const;

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production' && !process.argv.slice(2).includes('--production')) {
    console.error('На сервере (NODE_ENV=production) запуск только с флагом --production');
    process.exitCode = 1;
    return;
  }

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set (backend/.env)');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  try {
    const now = new Date();
    const results: Array<{ label: string; email: string; password: string }> = [];

    for (const { email, plan, label } of TEST_ACCOUNTS) {
      const password = randomBytes(12).toString('base64url');
      const data = {
        passwordHash: await hashPassword(password),
        emailVerifiedAt: now,
        plan,
        planUntil: plan === 'free' ? null : new Date(now.getTime() + YEAR_MS),
        blockedAt: null,
      };
      const account = await prisma.account.upsert({
        where: { email },
        update: data,
        create: { email, ...data },
      });
      // Пароль сменился — прежние сессии закрываются
      await prisma.session.updateMany({
        where: { accountId: account.id, revokedAt: null },
        data: { revokedAt: now },
      });
      results.push({ label, email, password });
    }

    console.log('| Тариф | Почта | Пароль |');
    console.log('| --- | --- | --- |');
    for (const { label, email, password } of results) {
      console.log(`| ${label} | ${email} | ${password} |`);
    }
    console.log('Пароли показаны один раз; повторный запуск задаёт новые.');
  } finally {
    await prisma.$disconnect();
  }
}

try {
  process.loadEnvFile('.env');
} catch {
  // .env необязателен: на сервере переменные приходят из окружения
}
await main();
