import { describe, expect, it } from 'vitest';

import type { IngredientProduct } from './ingredientProduct';
import { recipeNutrition } from './nutrition';

const products: IngredientProduct[] = [
  {
    id: 'rice',
    name: 'Рис',
    unit: 'g',
    stock: 0,
    per100g: { kcal: 300, protein: 10, fat: 2, carbs: 60 },
  },
  {
    id: 'eggs',
    name: 'Яйца',
    unit: 'pcs',
    pieceWeight: 50,
    stock: 0,
    per100g: { kcal: 150, protein: 12, fat: 10, carbs: 1 },
  },
  {
    id: 'milk',
    name: 'Молоко',
    unit: 'ml',
    stock: 0,
    per100g: { kcal: 50, protein: 3, fat: 2, carbs: 5 },
  },
];

describe('recipeNutrition', () => {
  it('считает КБЖУ всего рецепта и порции (шт — через вес штуки, мл ≈ г)', () => {
    const result = recipeNutrition(
      {
        servings: 2,
        ingredients: [
          { productId: 'rice', amount: 200, unit: 'g' }, // 600 ккал
          { productId: 'eggs', amount: 2, unit: 'pcs' }, // 100 г → 150 ккал
          { productId: 'milk', amount: 100, unit: 'ml' }, // 50 ккал
        ],
      },
      products,
    );
    expect(result.total).toEqual({ kcal: 800, protein: 35, fat: 16, carbs: 126 });
    expect(result.perServing).toEqual({ kcal: 400, protein: 17.5, fat: 8, carbs: 63 });
    expect(result.totalGrams).toBe(400);
    expect(result.uncountedIngredients).toBe(0);
  });

  it('не считает удалённые продукты и продукты со сменившейся единицей', () => {
    const result = recipeNutrition(
      {
        servings: 1,
        ingredients: [
          { productId: 'rice', amount: 100, unit: 'g' },
          { productId: 'gone', amount: 100, unit: 'g' },
          { productId: 'rice', amount: 1, unit: 'pcs' },
        ],
      },
      products,
    );
    expect(result.total.kcal).toBe(300);
    expect(result.uncountedIngredients).toBe(2);
  });

  it('пустой рецепт — нули', () => {
    const result = recipeNutrition({ servings: 4, ingredients: [] }, products);
    expect(result.perServing).toEqual({ kcal: 0, protein: 0, fat: 0, carbs: 0 });
  });
});
