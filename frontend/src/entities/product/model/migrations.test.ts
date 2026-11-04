import { describe, expect, it } from 'vitest';

import { migrateProducts, PRODUCTS_STORAGE_VERSION } from './migrations';

const v1Product = {
  id: 'p1',
  name: 'Гречка',
  per100g: { kcal: 313, protein: 12.6, fat: 3.3, carbs: 62.1 },
  stock: 750,
  createdAt: 1,
};

describe('migrateProducts', () => {
  it('текущая версия — 2', () => {
    expect(PRODUCTS_STORAGE_VERSION).toBe(2);
  });

  it('v1 → v2: добавляет единицу «г» и нулевой минимальный остаток, сохраняя данные', () => {
    expect(migrateProducts({ products: [v1Product] }, 1)).toEqual({
      products: [{ ...v1Product, unit: 'g', minStock: 0 }],
    });
  });

  it('v2: сохраняет штучный продукт с весом штуки', () => {
    const product = {
      id: 'p2',
      name: 'Яйцо',
      per100g: { kcal: 157, protein: 12.7, fat: 11.5, carbs: 0.7 },
      unit: 'pcs',
      pieceWeight: 55,
      stock: 6,
      minStock: 2,
      createdAt: 2,
    };
    expect(migrateProducts({ products: [product] }, 2).products[0]).toEqual(product);
  });

  it('убирает вес штуки у нештучных продуктов', () => {
    const product = { ...v1Product, unit: 'ml', pieceWeight: 30, minStock: 0 };
    expect(migrateProducts({ products: [product] }, 2).products[0]).not.toHaveProperty(
      'pieceWeight',
    );
  });

  it('неизвестная единица становится «г»', () => {
    const product = { ...v1Product, unit: 'kg', minStock: 0 };
    expect(migrateProducts({ products: [product] }, 2).products[0]?.unit).toBe('g');
  });

  it('отрицательные остатки обнуляются', () => {
    const product = { ...v1Product, stock: -5, minStock: -1, unit: 'g' };
    const [migrated] = migrateProducts({ products: [product] }, 2).products;
    expect(migrated?.stock).toBe(0);
    expect(migrated?.minStock).toBe(0);
  });

  it('отбрасывает некорректные записи', () => {
    const ids = migrateProducts(
      { products: [null, 42, { id: 1, name: 'x' }, { id: 'ok', name: 'Ок' }] },
      2,
    ).products.map((p) => p.id);
    expect(ids).toEqual(['ok']);
  });

  it('пустое или битое состояние даёт пустой список', () => {
    expect(migrateProducts(undefined, 1)).toEqual({ products: [] });
    expect(migrateProducts({ products: 'oops' }, 1)).toEqual({ products: [] });
  });
});
