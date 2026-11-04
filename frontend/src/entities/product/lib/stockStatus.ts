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
