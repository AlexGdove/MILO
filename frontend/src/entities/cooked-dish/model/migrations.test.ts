import { describe, expect, it } from 'vitest';

import { migrateCookedDishes, normalizeDish } from './migrations';

const dish = {
  id: 'd1',
  recipeId: 'r1',
  name: 'Омлет',
  servingsTotal: 4,
  servingsLeft: 3,
  portionGrams: 150,
  per100g: { kcal: 150, protein: 10, fat: 11, carbs: 2 },
  cookedAt: 7,
};

describe('normalizeDish', () => {
  it('оставляет корректное блюдо без изменений', () => {
    expect(normalizeDish(dish)).toEqual(dish);
  });

  it('отбрасывает запись без id или названия', () => {
    expect(normalizeDish({ name: 'X' })).toBeNull();
    expect(normalizeDish({ id: 'a' })).toBeNull();
    expect(normalizeDish(42)).toBeNull();
  });

  it('остаток порций не больше приготовленного и не меньше нуля', () => {
    expect(normalizeDish({ ...dish, servingsLeft: 10 })?.servingsLeft).toBe(4);
    expect(normalizeDish({ ...dish, servingsLeft: -2 })?.servingsLeft).toBe(0);
  });

  it('подставляет нули вместо некорректного КБЖУ', () => {
    expect(normalizeDish({ ...dish, per100g: { kcal: 'много' } })?.per100g).toEqual({
      kcal: 0,
      protein: 0,
      fat: 0,
      carbs: 0,
    });
  });
});

describe('migrateCookedDishes', () => {
  it('отбрасывает мусор и пустое состояние', () => {
    expect(migrateCookedDishes({ dishes: [dish, null] })).toEqual({ dishes: [dish] });
    expect(migrateCookedDishes(undefined)).toEqual({ dishes: [] });
  });
});
