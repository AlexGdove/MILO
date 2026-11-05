import type { IsoDate, Nutrients } from '@/shared/lib';

import type { MealEntryDraft, MealType } from '../model/types';

/** Что записи нужно знать о приготовленном блюде (структурный тип: FSD запрещает импорт между сущностями). */
export interface DishLike {
  id: string;
  name: string;
  portionGrams: number;
  per100g: Nutrients;
}

/**
 * Запись о съеденных порциях приготовленного блюда.
 * Источник — блюдо; `stockDeducted` = число порций, они вернутся блюду при удалении записи.
 */
export const buildDishEntry = (
  dish: DishLike,
  portions: number,
  date: IsoDate,
  mealType: MealType,
): MealEntryDraft => {
  const grams = dish.portionGrams * portions;
  return {
    date,
    mealType,
    source: { type: 'recipe', id: dish.id },
    productName: dish.name,
    per100g: dish.per100g,
    amount: Math.round(grams),
    unit: 'g',
    grams,
    stockDeducted: portions,
  };
};
