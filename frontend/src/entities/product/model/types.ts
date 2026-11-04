import type { Nutrients, Unit } from '@/shared/lib';

export interface Product {
  id: string;
  name: string;
  /** Пищевая ценность на 100 г (для жидкостей — на 100 мл, плотность принимаем за 1 г/мл) */
  per100g: Nutrients;
  /** Единица учёта остатка */
  unit: Unit;
  /** Вес одной штуки, г — только для unit === 'pcs', нужен для расчёта КБЖУ */
  pieceWeight?: number;
  /** Остаток в наличии в единицах продукта (0 — нет в наличии) */
  stock: number;
  /** Минимальный остаток: ниже него продукт «заканчивается» (0 — не отслеживать) */
  minStock: number;
  createdAt: number;
}

export type ProductDraft = Pick<
  Product,
  'name' | 'per100g' | 'unit' | 'pieceWeight' | 'stock' | 'minStock'
>;
