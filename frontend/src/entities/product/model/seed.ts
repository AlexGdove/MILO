import type { ProductDraft } from './types';

type SeedProduct = Omit<ProductDraft, 'stock' | 'minStock'>;

const SEED: SeedProduct[] = [
  {
    name: 'Куриная грудка',
    unit: 'g',
    per100g: { kcal: 113, protein: 23.6, fat: 1.9, carbs: 0.4 },
  },
  {
    name: 'Гречка (сухая)',
    unit: 'g',
    per100g: { kcal: 313, protein: 12.6, fat: 3.3, carbs: 62.1 },
  },
  { name: 'Рис (сухой)', unit: 'g', per100g: { kcal: 344, protein: 6.7, fat: 0.7, carbs: 78.9 } },
  {
    name: 'Овсяные хлопья',
    unit: 'g',
    per100g: { kcal: 352, protein: 12.3, fat: 6.2, carbs: 61.8 },
  },
  {
    name: 'Яйцо куриное',
    unit: 'pcs',
    pieceWeight: 55,
    per100g: { kcal: 157, protein: 12.7, fat: 11.5, carbs: 0.7 },
  },
  { name: 'Творог 5%', unit: 'g', per100g: { kcal: 121, protein: 17.2, fat: 5, carbs: 1.8 } },
  { name: 'Молоко 2,5%', unit: 'ml', per100g: { kcal: 52, protein: 2.8, fat: 2.5, carbs: 4.7 } },
  { name: 'Банан', unit: 'g', per100g: { kcal: 96, protein: 1.5, fat: 0.5, carbs: 21 } },
  { name: 'Яблоко', unit: 'g', per100g: { kcal: 47, protein: 0.4, fat: 0.4, carbs: 9.8 } },
  { name: 'Хлеб ржаной', unit: 'g', per100g: { kcal: 210, protein: 6.7, fat: 1.1, carbs: 42.5 } },
];

/** Стартовый набор продуктов при первом запуске (остаток 0, минимальный остаток не задан). */
export const SEED_PRODUCTS: ProductDraft[] = SEED.map((product) => ({
  ...product,
  stock: 0,
  minStock: 0,
}));
