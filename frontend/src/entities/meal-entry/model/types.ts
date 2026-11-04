import type { IsoDate, Nutrients } from '@/shared/lib';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MealEntry {
  id: string;
  date: IsoDate;
  mealType: MealType;
  productId: string;
  /** Снимок названия и КБЖУ на момент записи — история не ломается при правке/удалении продукта */
  productName: string;
  per100g: Nutrients;
  grams: number;
  /** Сколько грамм было списано с остатков (вернётся при удалении записи) */
  stockDeducted: number;
  createdAt: number;
}

export type MealEntryDraft = Omit<MealEntry, 'id' | 'createdAt'>;
