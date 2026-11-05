import { roundAmount, type Unit } from '@/shared/lib';

import type { Product } from '../model/types';

export type StockStatus = 'out' | 'low' | 'ok';

/** «Закончился» — остатка нет; «заканчивается» — остаток есть, но меньше минимального. */
export const getStockStatus = (product: Pick<Product, 'stock' | 'minStock'>): StockStatus => {
  if (product.stock <= 0) return 'out';
  if (product.minStock > 0 && product.stock < product.minStock) return 'low';
  return 'ok';
};

export const isLowStock = (product: Pick<Product, 'stock' | 'minStock'>): boolean =>
  getStockStatus(product) === 'low';

/**
 * Продукт отслеживается (задан минимальный остаток) и опустился ниже минимума.
 * Такие продукты MILO предлагает добавить в покупки — только предлагает, без автодобавления.
 */
export const needsRestock = (product: Pick<Product, 'stock' | 'minStock'>): boolean =>
  product.minStock > 0 && product.stock < product.minStock;

/** «Мало»: ниже минимального остатка, а если минимум не задан — закончился. */
const isRunningOut = (product: Pick<Product, 'stock' | 'minStock'>): boolean =>
  product.minStock > 0 ? product.stock < product.minStock : product.stock <= 0;

/**
 * Продукта стало мало именно сейчас (решение №31): до изменения было достаточно,
 * после — ниже минимума или закончился. Повторно при дальнейшем уменьшении не срабатывает.
 */
export const becameLow = (
  prev: Pick<Product, 'stock' | 'minStock'>,
  next: Pick<Product, 'stock' | 'minStock'>,
): boolean => !isRunningOut(prev) && isRunningOut(next);

/** Количество «на одну покупку» для продуктов без минимального остатка. */
const DEFAULT_PURCHASE: Record<Unit, number> = { g: 500, ml: 1000, pcs: 1 };

/**
 * Сколько предложить купить: недостающее до минимального остатка;
 * если минимум не задан или уже набран — минимум или типовое количество для единицы.
 */
export const suggestPurchaseAmount = (
  product: Pick<Product, 'stock' | 'minStock' | 'unit'>,
): number => {
  const deficit = roundAmount(product.minStock - product.stock, product.unit);
  if (deficit > 0) return deficit;
  if (product.minStock > 0) return product.minStock;
  return DEFAULT_PURCHASE[product.unit];
};
