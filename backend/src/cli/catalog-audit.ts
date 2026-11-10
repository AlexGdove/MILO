// Аудит общей базы продуктов (п. 7e): только чтение, ничего не меняет и не удаляет.
// Из корня: `npm run catalog:audit` (сборка и запуск); на сервере — в контейнере backend:
// `docker compose -f compose.prod.yaml exec backend node dist/cli/catalog-audit.js`.
import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/prisma/client.js';
import { formatAudit } from '../modules/products/catalog-audit.js';

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set (backend/.env)');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  try {
    const rows = await prisma.product.findMany({ orderBy: { createdAt: 'asc' } });
    console.log(
      formatAudit(
        rows.map((row) => ({
          id: row.id,
          name: row.name,
          brand: row.brand,
          barcode: row.barcode,
          unit: row.unit,
          kcal: Number(row.kcal),
          protein: Number(row.protein),
          fat: Number(row.fat),
          carbs: Number(row.carbs),
        })),
      ),
    );
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
