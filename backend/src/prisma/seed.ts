// Демо-данные для локальной разработки: `npm run db:seed` (из корня — сборка и запуск).
// Несколько продуктов общей базы (как будто принятых модерацией). Повторный запуск ничего не
// меняет; в production и с непустой базой продуктов не выполняется.
import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient, type Unit } from '../generated/prisma/client.js';

interface DemoProduct {
  name: string;
  brand: string | null;
  barcode: string | null;
  unit: Unit;
  pieceWeight: number | null;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
}

const g = (name: string, kcal: number, protein: number, fat: number, carbs: number) =>
  ({
    name,
    brand: null,
    barcode: null,
    unit: 'g',
    pieceWeight: null,
    kcal,
    protein,
    fat,
    carbs,
  }) as const;

const DEMO_PRODUCTS: DemoProduct[] = [
  { ...g('Гречка ядрица', 343, 12.6, 3.3, 62.1), barcode: '4600682000013' },
  g('Овсяные хлопья', 366, 12.3, 6.2, 61.8),
  { ...g('Молоко 2,5%', 52, 2.8, 2.5, 4.7), unit: 'ml' },
  { ...g('Яйцо куриное', 157, 12.7, 11.5, 0.7), unit: 'pcs', pieceWeight: 55 },
  { ...g('Банан', 95, 1.5, 0.2, 21.8), unit: 'pcs', pieceWeight: 120 },
  g('Куриное филе', 113, 23.6, 1.9, 0.4),
];

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Seed is for local development only');
  }
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set (backend/.env)');

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  try {
    if ((await prisma.product.count()) > 0) {
      console.log('Seed skipped: products already exist');
      return;
    }
    await prisma.$transaction(async (tx) => {
      for (const product of DEMO_PRODUCTS) {
        // Миллисекунды, как у продуктов через API (курсор страниц — с точностью Date)
        await tx.product.create({ data: { ...product, createdAt: new Date() } });
      }
    });
    console.log(`Seed done: ${DEMO_PRODUCTS.length} products`);
  } finally {
    await prisma.$disconnect();
  }
}

try {
  process.loadEnvFile('.env');
} catch {
  // .env необязателен — переменные могут прийти из окружения
}
await main();
