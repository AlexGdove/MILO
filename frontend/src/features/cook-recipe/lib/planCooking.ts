import type { IngredientProduct, RecipeAvailability } from '@/entities/recipe';
import { nutrientsForGrams, sumNutrients, toGrams, type Nutrients, type Unit } from '@/shared/lib';

/** Решение пользователя по ингредиенту, которого не хватает (решение №2: без автодобавления). */
export type ShortageDecision = 'shopping' | 'skip';

export interface CookingPlan {
  /** Что списать из кладовой: доступное, но не больше нужного */
  deductions: Array<{ productId: string; amount: number }>;
  /** Что добавить в покупки — только по выбору «в покупки» */
  toShopping: Array<{ productId: string; name: string; amount: number; unit: Unit }>;
  /** Нехватки, по которым пользователь ещё не решил */
  undecided: string[];
  /** Вес использованных продуктов, г */
  totalGrams: number;
  /** КБЖУ на 100 г готового блюда — по фактически использованному */
  per100g: Nutrients;
  /** Можно готовить: есть что списать и по всем нехваткам принято решение */
  canCook: boolean;
}

/** По нехватке можно выбрать «в покупки», только если продукт есть в кладовой и единица не менялась. */
export const canAddToShopping = (item: RecipeAvailability['items'][number]): boolean =>
  !item.productMissing && !item.unitChanged;

/**
 * План готовки. Чистая функция: ничего не меняет, только считает,
 * что списать, что добавить в покупки и КБЖУ получившегося блюда.
 */
export const planCooking = (
  availability: RecipeAvailability,
  products: readonly IngredientProduct[],
  decisions: Readonly<Record<string, ShortageDecision>>,
): CookingPlan => {
  const byId = new Map(products.map((product) => [product.id, product]));
  const plan: Omit<CookingPlan, 'per100g' | 'canCook'> = {
    deductions: [],
    toShopping: [],
    undecided: [],
    totalGrams: 0,
  };
  const parts: Nutrients[] = [];

  for (const item of availability.items) {
    const product = byId.get(item.productId);
    const used = Math.min(item.required, item.available);
    if (product && used > 0) {
      plan.deductions.push({ productId: item.productId, amount: used });
      const grams = toGrams(used, product.unit, product.pieceWeight);
      plan.totalGrams += grams;
      parts.push(nutrientsForGrams(product.per100g, grams));
    }

    if (item.shortage <= 0 || !canAddToShopping(item)) continue;
    const decision = decisions[item.productId];
    if (decision === undefined) plan.undecided.push(item.productId);
    else if (decision === 'shopping') {
      plan.toShopping.push({
        productId: item.productId,
        name: item.name,
        amount: item.shortage,
        unit: item.unit,
      });
    }
  }

  const total = sumNutrients(parts);
  const factor = plan.totalGrams > 0 ? 100 / plan.totalGrams : 0;
  return {
    ...plan,
    per100g: {
      kcal: total.kcal * factor,
      protein: total.protein * factor,
      fat: total.fat * factor,
      carbs: total.carbs * factor,
    },
    canCook: plan.deductions.length > 0 && plan.totalGrams > 0 && plan.undecided.length === 0,
  };
};
