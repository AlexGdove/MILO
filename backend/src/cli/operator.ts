// Операторы Telegram-ботов (поддержка и модерация, B-10): добавляются командой на сервере,
// не через API. Из корня: `npm run operator -- add <Telegram ID> <Имя>` (сборка и запуск).
// Telegram ID оператор узнаёт командой /id в любом из ботов.
import { PrismaPg } from '@prisma/adapter-pg';

import { OPERATOR_USAGE, parseOperatorArgs } from './operator-args.js';
import { PrismaClient } from '../generated/prisma/client.js';

async function main(): Promise<void> {
  const parsed = parseOperatorArgs(process.argv.slice(2));
  if (!parsed) {
    console.error(OPERATOR_USAGE);
    process.exitCode = 1;
    return;
  }
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set (backend/.env)');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  try {
    if (parsed.command === 'list') {
      const operators = await prisma.operator.findMany({ orderBy: { createdAt: 'asc' } });
      if (operators.length === 0) console.log('Операторов нет.');
      for (const operator of operators) {
        const state = operator.active ? 'активен' : 'выключен';
        console.log(`${operator.telegramUserId} — ${operator.displayName} (${state})`);
      }
    } else if (parsed.command === 'add') {
      const { telegramUserId, displayName } = parsed;
      await prisma.operator.upsert({
        where: { telegramUserId },
        create: { telegramUserId, displayName },
        update: { displayName, active: true },
      });
      console.log(`Оператор ${displayName} (${telegramUserId}) активен.`);
    } else {
      // Не удаляется: журнал модерации ссылается на оператора
      const { count } = await prisma.operator.updateMany({
        where: { telegramUserId: parsed.telegramUserId },
        data: { active: false },
      });
      console.log(
        count === 0 ? 'Такого оператора нет.' : `Оператор ${parsed.telegramUserId} выключен.`,
      );
    }
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
