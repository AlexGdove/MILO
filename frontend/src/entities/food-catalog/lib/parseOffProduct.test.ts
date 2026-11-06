import { describe, expect, it } from 'vitest';

import { parseOffProduct, type OffProduct } from './parseOffProduct';

const product = (overrides: Partial<OffProduct> = {}): OffProduct => ({
  code: '4813494063866',
  product_name: 'Buckwheat',
  product_name_ru: 'Гречка',
  brands: ['Ярмарка'],
  quantity: '900 г',
  nutriments: {
    'energy-kcal_100g': 340,
    proteins_100g: 13,
    fat_100g: 3.0999999046325684,
    carbohydrates_100g: 66,
  },
  ...overrides,
});

describe('parseOffProduct (Open Food Facts → продукт MILO)', () => {
  it('обычный товар: русское название, бренд, граммы, числа до сотых', () => {
    expect(parseOffProduct(product())).toEqual({
      code: '4813494063866',
      name: 'Гречка',
      brand: 'Ярмарка',
      unit: 'g',
      per100g: { kcal: 340, protein: 13, fat: 3.1, carbs: 66 },
    });
  });

  it('без русского названия берётся product_name', () => {
    expect(parseOffProduct(product({ product_name_ru: undefined }))?.name).toBe('Buckwheat');
  });

  it('бренд строкой — первый; без брендов — null', () => {
    expect(parseOffProduct(product({ brands: 'Простоквашино, Danone' }))?.brand).toBe(
      'Простоквашино',
    );
    expect(parseOffProduct(product({ brands: undefined }))?.brand).toBeNull();
  });

  it.each([
    ['литр', '1 л'],
    ['миллилитры', '930 мл'],
    ['латиница', '500 ml'],
  ])('объём в упаковке → мл: %s', (_name, quantity) => {
    expect(parseOffProduct(product({ quantity }))?.unit).toBe('ml');
  });

  it.each([
    ['нет кода', { code: undefined }],
    ['код из букв', { code: 'abc' }],
    ['нет названия', { product_name: undefined, product_name_ru: undefined }],
    ['нет калорий', { nutriments: { proteins_100g: 1, fat_100g: 1, carbohydrates_100g: 1 } }],
    [
      'калорий больше 900',
      {
        nutriments: {
          'energy-kcal_100g': 901,
          proteins_100g: 1,
          fat_100g: 1,
          carbohydrates_100g: 1,
        },
      },
    ],
    [
      'БЖУ больше 100 в сумме',
      {
        nutriments: {
          'energy-kcal_100g': 500,
          proteins_100g: 50,
          fat_100g: 40,
          carbohydrates_100g: 20,
        },
      },
    ],
  ])('возвращает null: %s', (_name, overrides) => {
    expect(parseOffProduct(product(overrides))).toBeNull();
  });
});
