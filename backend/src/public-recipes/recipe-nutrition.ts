// КБЖУ публичного рецепта по снимку ингредиентов (ADR-0002). Формулы совпадают с клиентом:
// frontend/src/shared/lib/units.ts (toGrams) и entities/recipe/lib/nutrition.ts (recipeNutrition).

export type Unit = 'g' | 'ml' | 'pcs';

export interface Nutrients {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
}

/** Снимок ингредиента: количество на весь рецепт в `unit`, КБЖУ — на 100 г. */
export interface IngredientSnapshot {
  amount: number;
  unit: Unit;
  pieceWeight: number | null;
  per100g: Nutrients;
}

/** Количество в граммах: мл ≈ г (плотность 1 г/мл), шт × вес штуки; без веса штуки — 0. */
export function toGrams(amount: number, unit: Unit, pieceWeight: number | null): number {
  if (unit === 'g') return amount;
  if (unit === 'ml') return amount;
  if (pieceWeight !== null && pieceWeight > 0) return amount * pieceWeight;
  return 0;
}

/** Округление до сотых — точность колонок `numeric(8,2)`. */
export function roundTo2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** КБЖУ одной порции; округление только в конце, чтобы не копить погрешность. */
export function perServingNutrition(
  ingredients: readonly IngredientSnapshot[],
  servings: number,
): Nutrients {
  const total: Nutrients = { kcal: 0, protein: 0, fat: 0, carbs: 0 };

  for (const ingredient of ingredients) {
    const factor = toGrams(ingredient.amount, ingredient.unit, ingredient.pieceWeight) / 100;
    total.kcal += ingredient.per100g.kcal * factor;
    total.protein += ingredient.per100g.protein * factor;
    total.fat += ingredient.per100g.fat * factor;
    total.carbs += ingredient.per100g.carbs * factor;
  }

  const divisor = Math.max(1, servings);
  return {
    kcal: roundTo2(total.kcal / divisor),
    protein: roundTo2(total.protein / divisor),
    fat: roundTo2(total.fat / divisor),
    carbs: roundTo2(total.carbs / divisor),
  };
}
