import { roundAmount, type Unit } from '@/shared/lib';

import type { IngredientProduct } from './ingredientProduct';
import type { Recipe } from '../model/types';

/** Хватает / есть, но меньше нужного / нет совсем (или продукт удалён, или сменилась единица). */
export type AvailabilityStatus = 'enough' | 'partial' | 'missing';

/** Подписи статуса всего рецепта. */
export const AVAILABILITY_LABEL: Record<AvailabilityStatus, string> = {
  enough: 'Всё есть',
  partial: 'Не всего хватает',
  missing: 'Нет продуктов',
};

export interface IngredientAvailability {
  productId: string;
  /** Название продукта; пусто, если продукт удалён из кладовой */
  name: string;
  unit: Unit;
  /** Сколько нужно на выбранное число порций */
  required: number;
  /** Сколько есть в кладовой (0, если продукт удалён или единица не совпадает) */
  available: number;
  /** Сколько не хватает */
  shortage: number;
  status: AvailabilityStatus;
  productMissing: boolean;
  unitChanged: boolean;
}

export interface RecipeAvailability {
  servings: number;
  items: IngredientAvailability[];
  /** enough — хватает всего; missing — нет ни одного ингредиента; иначе partial */
  status: AvailabilityStatus;
}

/** Количество ингредиента, пересчитанное на число порций. */
export const scaleAmount = (amount: number, unit: Unit, factor: number): number =>
  roundAmount(amount * factor, unit);

/**
 * Проверка наличия ингредиентов на выбранное число порций.
 * Чистая функция: ничего не списывает, только сравнивает с остатками.
 */
export const checkAvailability = (
  recipe: Pick<Recipe, 'servings' | 'ingredients'>,
  products: readonly IngredientProduct[],
  servings: number = recipe.servings,
): RecipeAvailability => {
  const byId = new Map(products.map((product) => [product.id, product]));
  const factor = servings / recipe.servings;

  const items = recipe.ingredients.map((ingredient): IngredientAvailability => {
    const product = byId.get(ingredient.productId);
    const unitChanged = product !== undefined && product.unit !== ingredient.unit;
    const required = scaleAmount(ingredient.amount, ingredient.unit, factor);
    const available = product && !unitChanged ? product.stock : 0;
    const shortage = Math.max(0, roundAmount(required - available, ingredient.unit));
    let status: AvailabilityStatus = 'partial';
    if (shortage === 0) status = 'enough';
    else if (available <= 0) status = 'missing';

    return {
      productId: ingredient.productId,
      name: product?.name ?? '',
      unit: ingredient.unit,
      required,
      available,
      shortage,
      status,
      productMissing: product === undefined,
      unitChanged,
    };
  });

  let status: AvailabilityStatus = 'partial';
  if (items.every((item) => item.status === 'enough')) status = 'enough';
  else if (items.every((item) => item.status === 'missing')) status = 'missing';

  return { servings, items, status };
};
