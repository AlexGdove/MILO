import { describe, expect, it } from 'vitest';

import { checkAvailability, type IngredientProduct } from '@/entities/recipe';

import { planCooking } from './planCooking';

const products: IngredientProduct[] = [
  {
    id: 'eggs',
    name: 'Яйца',
    unit: 'pcs',
    pieceWeight: 50,
    stock: 2,
    per100g: { kcal: 150, protein: 12, fat: 10, carbs: 1 },
  },
  {
    id: 'milk',
    name: 'Молоко',
    unit: 'ml',
    stock: 1000,
    per100g: { kcal: 50, protein: 3, fat: 2, carbs: 5 },
  },
  {
    id: 'cheese',
    name: 'Сыр',
    unit: 'g',
    stock: 0,
    per100g: { kcal: 350, protein: 25, fat: 27, carbs: 0 },
  },
];

const recipe = {
  servings: 2,
  ingredients: [
    { productId: 'eggs', amount: 4, unit: 'pcs' as const }, // есть 2 — частично
    { productId: 'milk', amount: 100, unit: 'ml' as const }, // хватает
    { productId: 'cheese', amount: 50, unit: 'g' as const }, // нет
  ],
};

const availability = checkAvailability(recipe, products);

describe('planCooking', () => {
  it('без решений по нехваткам готовить нельзя — ничего не добавляется в покупки само', () => {
    const plan = planCooking(availability, products, {});
    expect(plan.undecided).toEqual(['eggs', 'cheese']);
    expect(plan.toShopping).toEqual([]);
    expect(plan.canCook).toBe(false);
  });

  it('списывает доступное, но не больше нужного', () => {
    const plan = planCooking(availability, products, { eggs: 'skip', cheese: 'skip' });
    expect(plan.deductions).toEqual([
      { productId: 'eggs', amount: 2 },
      { productId: 'milk', amount: 100 },
    ]);
    expect(plan.canCook).toBe(true);
  });

  it('в покупки — только то, что выбрано, на величину нехватки', () => {
    const plan = planCooking(availability, products, { eggs: 'shopping', cheese: 'skip' });
    expect(plan.toShopping).toEqual([{ productId: 'eggs', name: 'Яйца', amount: 2, unit: 'pcs' }]);
  });

  it('КБЖУ блюда — по фактически использованным продуктам', () => {
    // 2 яйца = 100 г (150 ккал) + 100 мл молока (50 ккал) → 200 г, 200 ккал → 100 ккал/100 г
    const plan = planCooking(availability, products, { eggs: 'skip', cheese: 'skip' });
    expect(plan.totalGrams).toBe(200);
    expect(plan.per100g).toEqual({ kcal: 100, protein: 7.5, fat: 6, carbs: 3 });
  });

  it('если списать нечего — готовить нельзя', () => {
    const empty = checkAvailability(
      { servings: 1, ingredients: [{ productId: 'cheese', amount: 50, unit: 'g' }] },
      products,
    );
    const plan = planCooking(empty, products, { cheese: 'skip' });
    expect(plan.deductions).toEqual([]);
    expect(plan.canCook).toBe(false);
  });

  it('удалённый продукт не требует решения и не попадает в покупки', () => {
    const withGone = checkAvailability(
      {
        servings: 1,
        ingredients: [
          { productId: 'milk', amount: 100, unit: 'ml' },
          { productId: 'gone', amount: 10, unit: 'g' },
        ],
      },
      products,
    );
    const plan = planCooking(withGone, products, {});
    expect(plan.undecided).toEqual([]);
    expect(plan.toShopping).toEqual([]);
    expect(plan.canCook).toBe(true);
  });
});
