import type { Nutrients } from '@/shared/lib';

export interface Product {
  id: string;
  name: string;
  /** Пищевая ценность на 100 г */
  per100g: Nutrients;
  /** Остаток в наличии, г (0 — нет в наличии) */
  stock: number;
  createdAt: number;
}

export type ProductDraft = Pick<Product, 'name' | 'per100g' | 'stock'>;
