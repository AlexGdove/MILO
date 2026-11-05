import { describe, expect, it } from 'vitest';

import { migrateRecipes, normalizeRecipe } from './migrations';

describe('normalizeRecipe', () => {
  it('оставляет корректный рецепт без изменений', () => {
    const input = {
      id: 'r1',
      name: 'Омлет',
      servings: 2,
      ingredients: [{ productId: 'eggs', amount: 3, unit: 'pcs' }],
      createdAt: 5,
    };
    expect(normalizeRecipe(input)).toEqual(input);
  });

  it('отбрасывает запись без id или названия', () => {
    expect(normalizeRecipe({ name: 'X' })).toBeNull();
    expect(normalizeRecipe({ id: 'a' })).toBeNull();
    expect(normalizeRecipe(null)).toBeNull();
  });

  it('приводит число порций к целому не меньше 1', () => {
    expect(normalizeRecipe({ id: 'a', name: 'A', servings: 0 })?.servings).toBe(1);
    expect(normalizeRecipe({ id: 'a', name: 'A', servings: 2.6 })?.servings).toBe(3);
    expect(normalizeRecipe({ id: 'a', name: 'A', servings: 'много' })?.servings).toBe(1);
  });

  it('убирает некорректные ингредиенты и подставляет единицу г', () => {
    const input = {
      id: 'a',
      name: 'A',
      servings: 1,
      ingredients: [
        { productId: 'rice', amount: 100, unit: 'кг' },
        { productId: 'salt', amount: 0, unit: 'g' },
        { amount: 5 },
        'x',
      ],
      createdAt: 1,
    };
    expect(normalizeRecipe(input)?.ingredients).toEqual([
      { productId: 'rice', amount: 100, unit: 'g' },
    ]);
  });
});

describe('migrateRecipes', () => {
  it('отбрасывает мусор', () => {
    const recipe = { id: 'a', name: 'A', servings: 1, ingredients: [], createdAt: 1 };
    expect(migrateRecipes({ recipes: [recipe, 42] })).toEqual({ recipes: [recipe] });
  });

  it('на пустом состоянии возвращает пустой список', () => {
    expect(migrateRecipes(undefined)).toEqual({ recipes: [] });
    expect(migrateRecipes({ recipes: 'x' })).toEqual({ recipes: [] });
  });
});
