import { describe, expect, it } from 'vitest';

import { filterProducts } from './filterProducts';
import type { Product } from '../model/types';

const product = (id: string, name: string, barcode?: string): Product => ({
  id,
  name,
  per100g: { kcal: 1, protein: 1, fat: 1, carbs: 1 },
  unit: 'g',
  stock: 0,
  minStock: 0,
  createdAt: 0,
  ...(barcode && { barcode }),
});

const items = [
  product('a', 'Гречка ядрица', '4600000000017'),
  product('b', 'Рис'),
  product('c', 'Кефир', '4600000000024'),
];

describe('filterProducts', () => {
  it('ищет по части названия без учёта регистра', () => {
    expect(filterProducts(items, 'ГРЕЧ').map((p) => p.id)).toEqual(['a']);
  });

  it('ищет по штрихкоду или его части', () => {
    expect(filterProducts(items, '4600000000024').map((p) => p.id)).toEqual(['c']);
    expect(filterProducts(items, '46000000000').map((p) => p.id)).toEqual(['a', 'c']);
  });

  it('находит тот же товар в другой записи: сохранён UPC-A, отсканирован EAN-13 с нулём', () => {
    const withUpc = [...items, product('d', 'Сок', '036000291452')];
    expect(filterProducts(withUpc, '0036000291452').map((p) => p.id)).toEqual(['d']);
  });

  it('пустой запрос — все продукты', () => {
    expect(filterProducts(items, '  ')).toHaveLength(3);
  });
});
