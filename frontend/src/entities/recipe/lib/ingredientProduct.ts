import type { Nutrients, Unit } from '@/shared/lib';

/**
 * Что рецепту нужно знать о продукте. Структурный тип вместо импорта `entities/product`:
 * FSD запрещает импорт между сущностями, а продукт кладовой этому типу соответствует.
 */
export interface IngredientProduct {
  id: string;
  name: string;
  unit: Unit;
  pieceWeight?: number;
  stock: number;
  per100g: Nutrients;
}
