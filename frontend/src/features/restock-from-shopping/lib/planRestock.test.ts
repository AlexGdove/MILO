import { describe, expect, it } from 'vitest';

import type { ShoppingItem } from '@/entities/shopping-item';

import { getRestockIssue, planRestock } from './planRestock';

const item = (overrides: Partial<ShoppingItem>): ShoppingItem => ({
  id: 'i1',
  productId: 'p1',
  name: 'Рис',
  amount: 900,
  unit: 'g',
  checked: true,
  createdAt: 1,
  ...overrides,
});

const products = [
  { id: 'p1', unit: 'g' as const },
  { id: 'p2', unit: 'pcs' as const },
];

describe('planRestock', () => {
  it('переносит только отмеченные позиции', () => {
    const plan = planRestock(
      [item({}), item({ id: 'i2', productId: 'p2', amount: 10, unit: 'pcs', checked: false })],
      products,
    );
    expect(plan).toEqual({
      restock: [{ itemId: 'i1', productId: 'p1', amount: 900 }],
      skipped: [],
    });
  });

  it('пропускает позиции удалённых продуктов и со сменившейся единицей', () => {
    const plan = planRestock(
      [
        item({ id: 'gone', productId: 'deleted' }),
        item({ id: 'unit', productId: 'p2', unit: 'g' }),
        item({ id: 'ok', productId: 'p2', amount: 6, unit: 'pcs' }),
      ],
      products,
    );
    expect(plan.restock).toEqual([{ itemId: 'ok', productId: 'p2', amount: 6 }]);
    expect(plan.skipped).toEqual([
      { itemId: 'gone', issue: 'missing-product' },
      { itemId: 'unit', issue: 'unit-changed' },
    ]);
  });

  it('пустой список — пустой план', () => {
    expect(planRestock([], products)).toEqual({ restock: [], skipped: [] });
  });
});

describe('getRestockIssue', () => {
  it('null, когда продукт есть и единица совпадает', () => {
    expect(getRestockIssue({ productId: 'p1', unit: 'g' }, products[0])).toBeNull();
  });

  it('распознаёт удалённый продукт и смену единицы', () => {
    expect(getRestockIssue({ productId: 'x', unit: 'g' }, undefined)).toBe('missing-product');
    expect(getRestockIssue({ productId: 'p2', unit: 'g' }, products[1])).toBe('unit-changed');
  });
});
