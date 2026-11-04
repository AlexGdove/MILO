import type { ProductDraft } from './types';

/** Стартовый набор продуктов при первом запуске. */
export const SEED_PRODUCTS: ProductDraft[] = [
  { name: 'Куриная грудка', per100g: { kcal: 113, protein: 23.6, fat: 1.9, carbs: 0.4 }, stock: 0 },
  {
    name: 'Гречка (сухая)',
    per100g: { kcal: 313, protein: 12.6, fat: 3.3, carbs: 62.1 },
    stock: 0,
  },
  { name: 'Рис (сухой)', per100g: { kcal: 344, protein: 6.7, fat: 0.7, carbs: 78.9 }, stock: 0 },
  {
    name: 'Овсяные хлопья',
    per100g: { kcal: 352, protein: 12.3, fat: 6.2, carbs: 61.8 },
    stock: 0,
  },
  { name: 'Яйцо куриное', per100g: { kcal: 157, protein: 12.7, fat: 11.5, carbs: 0.7 }, stock: 0 },
  { name: 'Творог 5%', per100g: { kcal: 121, protein: 17.2, fat: 5, carbs: 1.8 }, stock: 0 },
  { name: 'Молоко 2,5%', per100g: { kcal: 52, protein: 2.8, fat: 2.5, carbs: 4.7 }, stock: 0 },
  { name: 'Банан', per100g: { kcal: 96, protein: 1.5, fat: 0.5, carbs: 21 }, stock: 0 },
  { name: 'Яблоко', per100g: { kcal: 47, protein: 0.4, fat: 0.4, carbs: 9.8 }, stock: 0 },
  { name: 'Хлеб ржаной', per100g: { kcal: 210, protein: 6.7, fat: 1.1, carbs: 42.5 }, stock: 0 },
];
