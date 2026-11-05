import { nutrientsForGrams, sumNutrients, toGrams, type Nutrients } from '@/shared/lib';

import type { IngredientProduct } from './ingredientProduct';
import type { Recipe } from '../model/types';

export interface RecipeNutrition {
  /** КБЖУ всего рецепта */
  total: Nutrients;
  /** КБЖУ одной порции */
  perServing: Nutrients;
  /** Вес всего рецепта, г (мл ≈ г) */
  totalGrams: number;
  /** Ингредиенты, которые не удалось посчитать: продукт удалён, сменилась единица или нет веса штуки */
  uncountedIngredients: number;
}

/** КБЖУ рецепта по данным продуктов кладовой (на 100 г, вес штуки для шт). */
export const recipeNutrition = (
  recipe: Pick<Recipe, 'servings' | 'ingredients'>,
  products: readonly IngredientProduct[],
): RecipeNutrition => {
  const byId = new Map(products.map((product) => [product.id, product]));
  const parts: Nutrients[] = [];
  let totalGrams = 0;
  let uncountedIngredients = 0;

  for (const ingredient of recipe.ingredients) {
    const product = byId.get(ingredient.productId);
    const grams =
      product && product.unit === ingredient.unit
        ? toGrams(ingredient.amount, ingredient.unit, product.pieceWeight)
        : 0;
    if (!product || grams <= 0) {
      uncountedIngredients++;
      continue;
    }
    totalGrams += grams;
    parts.push(nutrientsForGrams(product.per100g, grams));
  }

  const total = sumNutrients(parts);
  const servings = Math.max(1, recipe.servings);
  return {
    total,
    perServing: {
      kcal: total.kcal / servings,
      protein: total.protein / servings,
      fat: total.fat / servings,
      carbs: total.carbs / servings,
    },
    totalGrams,
    uncountedIngredients,
  };
};
