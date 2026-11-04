import { describe, expect, it } from 'vitest';

import { getStockStatus, isLowStock } from './stockStatus';

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
