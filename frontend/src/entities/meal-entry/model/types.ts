import type { IsoDate, Nutrients, Unit } from '@/shared/lib';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

/** Откуда запись: продукт из кладовой или приготовленное блюдо (id — у `entities/cooked-dish`). */
export interface MealEntrySource {
  type: 'product' | 'recipe';
  id: string;
}

export interface MealEntry {
  id: string;
  date: IsoDate;
  mealType: MealType;
  source: MealEntrySource;
  /** Снимок названия и КБЖУ на момент записи — история не ломается при правке/удалении продукта */
  productName: string;
  per100g: Nutrients;
  /** Количество в единице источника (г, мл, шт) — для отображения */
  amount: number;
  unit: Unit;
  /** Вес в граммах — для расчёта КБЖУ */
  grams: number;
  /**
   * Сколько списано (вернётся при удалении записи): для продукта — с остатка, в единице продукта;
   * для приготовленного блюда — число порций.
   */
  stockDeducted: number;
  createdAt: number;
}

export type MealEntryDraft = Omit<MealEntry, 'id' | 'createdAt'>;
