import type { Unit } from '@/shared/lib';

/** Ингредиент — продукт кладовой и его количество на весь рецепт, в единице продукта. */
export interface RecipeIngredient {
  productId: string;
  amount: number;
  unit: Unit;
}

export interface Recipe {
  id: string;
  name: string;
  /** На сколько порций рассчитаны количества ингредиентов */
  servings: number;
  ingredients: RecipeIngredient[];
  createdAt: number;
}

export type RecipeDraft = Pick<Recipe, 'name' | 'servings' | 'ingredients'>;
