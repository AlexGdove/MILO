import { describe, expect, it } from 'vitest';

import { getStockStatus, isLowStock, needsRestock, suggestPurchaseAmount } from './stockStatus';

describe('getStockStatus', () => {
  it.each([
    [{ stock: 0, minStock: 0 }, 'out'],
    [{ stock: 0, minStock: 5 }, 'out'],
    [{ stock: 1, minStock: 2 }, 'low'],
    [{ stock: 2, minStock: 2 }, 'ok'],
    [{ stock: 300, minStock: 0 }, 'ok'],
  ] as const)('%o → %s', (product, expected) => {
    expect(getStockStatus(product)).toBe(expected);
  });
});

describe('isLowStock', () => {
  it('true только когда остаток есть, но меньше минимального', () => {
    expect(isLowStock({ stock: 1, minStock: 2 })).toBe(true);
    expect(isLowStock({ stock: 0, minStock: 2 })).toBe(false);
    expect(isLowStock({ stock: 5, minStock: 2 })).toBe(false);
  });
});

describe('needsRestock', () => {
  it('true только для отслеживаемых продуктов ниже минимального остатка', () => {
    expect(needsRestock({ stock: 0, minStock: 2 })).toBe(true);
    expect(needsRestock({ stock: 1, minStock: 2 })).toBe(true);
    expect(needsRestock({ stock: 2, minStock: 2 })).toBe(false);
    // минимальный остаток не задан — продукт не отслеживается, даже если закончился
    expect(needsRestock({ stock: 0, minStock: 0 })).toBe(false);
  });
});

describe('suggestPurchaseAmount', () => {
  it('предлагает недостающее до минимального остатка', () => {
    expect(suggestPurchaseAmount({ stock: 150, minStock: 500, unit: 'g' })).toBe(350);
    expect(suggestPurchaseAmount({ stock: 0, minStock: 6, unit: 'pcs' })).toBe(6);
    expect(suggestPurchaseAmount({ stock: 0.5, minStock: 2, unit: 'pcs' })).toBe(1.5);
  });

  it('если минимум набран — предлагает сам минимум', () => {
    expect(suggestPurchaseAmount({ stock: 900, minStock: 500, unit: 'ml' })).toBe(500);
  });

  it('без минимального остатка — типовое количество для единицы', () => {
    expect(suggestPurchaseAmount({ stock: 0, minStock: 0, unit: 'g' })).toBe(500);
    expect(suggestPurchaseAmount({ stock: 0, minStock: 0, unit: 'ml' })).toBe(1000);
    expect(suggestPurchaseAmount({ stock: 3, minStock: 0, unit: 'pcs' })).toBe(1);
  });
});
