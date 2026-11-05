import type { Nutrients } from '@/shared/lib';

/**
 * Приготовленное блюдо (решение №25): сварил 6 порций, съел 2 — осталось 4.
 * КБЖУ — снимок на момент готовки по фактически использованным продуктам,
 * поэтому правка рецепта или продуктов не меняет уже приготовленное.
 */
export interface CookedDish {
  id: string;
  recipeId: string;
  name: string;
  servingsTotal: number;
  servingsLeft: number;
  /** Вес одной порции, г */
  portionGrams: number;
  /** КБЖУ на 100 г готового блюда */
  per100g: Nutrients;
  cookedAt: number;
}

export type CookedDishDraft = Omit<CookedDish, 'id' | 'servingsLeft' | 'cookedAt'>;
