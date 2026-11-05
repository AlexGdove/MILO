import { describe, expect, it } from 'vitest';

import { checkAvailability } from './availability';
import type { IngredientProduct } from './ingredientProduct';

const per100g = { kcal: 100, protein: 1, fat: 1, carbs: 1 };
const products: IngredientProduct[] = [
  { id: 'rice', name: 'Рис', unit: 'g', stock: 300, per100g },
  { id: 'eggs', name: 'Яйца', unit: 'pcs', pieceWeight: 55, stock: 1, per100g },
  { id: 'milk', name: 'Молоко', unit: 'ml', stock: 0, per100g },
];
const recipe = {
  servings: 2,
  ingredients: [
    { productId: 'rice', amount: 200, unit: 'g' as const },
    { productId: 'eggs', amount: 3, unit: 'pcs' as const },
    { productId: 'milk', amount: 100, unit: 'ml' as const },
  ],
};
const single = (ingredient: { productId: string; amount: number; unit: 'g' | 'ml' | 'pcs' }) => ({
  servings: 2,
  ingredients: [ingredient],
});

describe('checkAvailability', () => {
  it('на базовое число порций: рис хватает, яиц частично, молока нет', () => {
    const result = checkAvailability(recipe, products);
    expect(result.items[0]?.status).toBe('enough');
    expect(result.items[1]?.status).toBe('partial');
    expect(result.items[1]?.shortage).toBe(2);
    expect(result.items[2]?.status).toBe('missing');
    expect(result.items[2]?.shortage).toBe(100);
    expect(result.status).toBe('partial');
  });

  it('пересчитывает количества на другое число порций', () => {
    const result = checkAvailability(recipe, products, 4);
    expect(result.servings).toBe(4);
    expect(result.items[0]).toMatchObject({ required: 400, status: 'partial', shortage: 100 });
    expect(result.items[1]).toMatchObject({ required: 6, status: 'partial', shortage: 5 });
    expect(result.items[2]).toMatchObject({ required: 200, status: 'missing', shortage: 200 });
    expect(result.status).toBe('partial');
  });

  it('штучные количества при пересчёте округляются до десятых', () => {
    const result = checkAvailability(recipe, products, 1);
    expect(result.items[1]?.required).toBe(1.5);
  });

  it('всего хватает — общий статус enough', () => {
    const result = checkAvailability(
      single({ productId: 'rice', amount: 200, unit: 'g' }),
      products,
    );
    expect(result.status).toBe('enough');
  });

  it('удалённый продукт считается отсутствующим', () => {
    const result = checkAvailability(
      single({ productId: 'gone', amount: 50, unit: 'g' }),
      products,
    );
    expect(result.items[0]).toMatchObject({ productMissing: true, status: 'missing', name: '' });
    expect(result.status).toBe('missing');
  });

  it('сменившаяся единица продукта — в наличии 0', () => {
    const result = checkAvailability(
      single({ productId: 'rice', amount: 2, unit: 'pcs' }),
      products,
    );
    expect(result.items[0]).toMatchObject({ unitChanged: true, available: 0, status: 'missing' });
    expect(result.status).toBe('missing');
  });
});
