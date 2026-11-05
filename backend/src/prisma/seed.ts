// Демо-данные для локальной разработки: `npm run db:seed` (из корня — сборка и запуск).
// Три публичных рецепта от демо-устройства. Повторный запуск ничего не меняет;
// в production и с непустым каталогом не выполняется.
import { createHash, randomBytes } from 'node:crypto';

import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient, type Unit } from '../generated/prisma/client.js';
import {
  perServingNutrition,
  type IngredientSnapshot,
} from '../public-recipes/recipe-nutrition.js';

interface DemoIngredient extends IngredientSnapshot {
  name: string;
  unit: Unit;
}

const g = (
  name: string,
  amount: number,
  kcal: number,
  protein: number,
  fat: number,
  carbs: number,
) =>
  ({ name, amount, unit: 'g', pieceWeight: null, per100g: { kcal, protein, fat, carbs } }) as const;

const DEMO_RECIPES: Array<{ name: string; servings: number; ingredients: DemoIngredient[] }> = [
  {
    name: 'Овсяная каша с бананом',
    servings: 2,
    ingredients: [
      g('Овсяные хлопья', 100, 366, 12.3, 6.2, 61.8),
      { ...g('Молоко 2,5%', 400, 52, 2.8, 2.5, 4.7), unit: 'ml' },
      {
        name: 'Банан',
        amount: 1,
        unit: 'pcs',
        pieceWeight: 120,
        per100g: { kcal: 95, protein: 1.5, fat: 0.2, carbs: 21.8 },
      },
    ],
  },
  {
    name: 'Омлет с помидорами',
    servings: 1,
    ingredients: [
      {
        name: 'Яйцо куриное',
        amount: 3,
        unit: 'pcs',
        pieceWeight: 55,
        per100g: { kcal: 157, protein: 12.7, fat: 11.5, carbs: 0.7 },
      },
      g('Помидоры', 150, 20, 1.1, 0.2, 3.7),
      { ...g('Молоко 2,5%', 50, 52, 2.8, 2.5, 4.7), unit: 'ml' },
    ],
  },
  {
    name: 'Гречка с курицей',
    servings: 3,
    ingredients: [
      g('Гречка', 200, 313, 12.6, 3.3, 57.1),
      g('Куриное филе', 400, 113, 23.6, 1.9, 0.4),
      g('Лук репчатый', 80, 41, 1.4, 0.2, 8.2),
    ],
  },
];

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Seed is for local development only');
  }
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set (backend/.env)');

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  try {
    if ((await prisma.publicRecipe.count()) > 0) {
      console.log('Seed skipped: public recipes already exist');
      return;
    }
    // Ключ демо-устройства нигде не нужен — храним только хэш, как и для настоящих ключей
    const keyHash = createHash('sha256').update(randomBytes(32)).digest('hex');
    await prisma.$transaction(async (tx) => {
      const author = await tx.deviceKey.create({ data: { keyHash } });
      for (const recipe of DEMO_RECIPES) {
        const perServing = perServingNutrition(recipe.ingredients, recipe.servings);
        await tx.publicRecipe.create({
          data: {
            authorKeyId: author.id,
            name: recipe.name,
            servings: recipe.servings,
            kcalPerServing: perServing.kcal,
            proteinPerServing: perServing.protein,
            fatPerServing: perServing.fat,
            carbsPerServing: perServing.carbs,
            ingredients: {
              create: recipe.ingredients.map((ingredient, position) => ({
                position,
                name: ingredient.name,
                amount: ingredient.amount,
                unit: ingredient.unit,
                pieceWeight: ingredient.pieceWeight,
                ...ingredient.per100g,
              })),
            },
          },
        });
      }
    });
    console.log(`Seed done: ${DEMO_RECIPES.length} public recipes`);
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
