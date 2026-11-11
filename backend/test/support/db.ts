import type { PrismaService } from '../../src/prisma/prisma.service.js';

const TABLES = [
  'device_keys',
  'products',
  'product_submissions',
  'operators',
  'moderation_actions',
  'support_tickets',
  'support_messages',
  'telegram_message_links',
  'telegram_updates',
  'outbox_events',
  'idempotency_keys',
  'client_errors',
  'accounts',
  'login_codes',
  'sessions',
];

/** Пустые таблицы и счётчики с 1 — каждый тест независим от предыдущих. */
export async function resetData(prisma: PrismaService): Promise<void> {
  await prisma.$executeRawUnsafe(
    `TRUNCATE ${TABLES.map((table) => `"${table}"`).join(', ')} RESTART IDENTITY CASCADE`,
  );
}
