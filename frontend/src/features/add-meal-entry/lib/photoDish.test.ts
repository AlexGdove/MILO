import { describe, expect, it } from 'vitest';

import { EMPTY_NUTRIENTS, type Nutrients } from '@/shared/lib';

import {
  canSaveDish,
  dishTotals,
  ingredientGrams,
  removeIngredient,
  setIngredientGrams,
  setIngredientProduct,
  toDishIngredients,
  type DishIngredient,
  type OwnProduct,
  type Recognition,
} from './photoDish';

const KBJU: Nutrients = { kcal: 100, protein: 2, fat: 3, carbs: 4 };
const BUCKWHEAT: Nutrients = { kcal: 110, protein: 4.2, fat: 1.1, carbs: 21 };
const BUTTER: Nutrients = { kcal: 748, protein: 0.5, fat: 82.5, carbs: 0.8 };

const row = (overrides: Partial<DishIngredient> = {}): DishIngredient => ({
  key: 'k1',
  name: 'А',
  gramsInput: '100',
  per100g: KBJU,
  sourceName: null,
  productId: null,
  ...overrides,
});

const recognition = (ingredients: Recognition['ingredients']): Recognition => ({
  dish: 'Блюдо',
  ingredients,
  usage: { used: null, limit: null },
});

describe('toDishIngredients', () => {
  it('сохраняет порядок и берёт КБЖУ сервера, даже если есть свой продукт с тем же названием', () => {
    const own: OwnProduct[] = [
      { id: 'p1', name: 'Гречка', per100g: { kcal: 999, protein: 9, fat: 9, carbs: 9 } },
    ];
    const result = toDishIngredients(
      recognition([
        { name: 'Гречка', grams: 200, matchedName: 'гречка отварная', per100g: BUCKWHEAT },
        { name: 'масло', grams: 10, matchedName: 'масло сливочное', per100g: BUTTER },
      ]),
      own,
    );
    expect(result.map((item) => item.name)).toEqual(['Гречка', 'масло']);
    expect(result[0]).toMatchObject({
      gramsInput: '200',
      per100g: BUCKWHEAT,
      sourceName: 'гречка отварная',
      productId: null,
    });
  });

  it('для продукта не из справочника ищет свой продукт без учёта регистра и пробелов', () => {
    const own: OwnProduct[] = [{ id: 'p2', name: 'соус песто', per100g: KBJU }];
    const [item] = toDishIngredients(
      recognition([{ name: '  Соус Песто ', grams: 50, matchedName: null, per100g: null }]),
      own,
    );
    expect(item).toMatchObject({ per100g: KBJU, sourceName: 'соус песто', productId: 'p2' });
  });

  it('оставляет КБЖУ неизвестным, если продукта нет ни в справочнике, ни у пользователя', () => {
    const [item] = toDishIngredients(
      recognition([{ name: 'марсианский соус', grams: 10, matchedName: null, per100g: null }]),
      [],
    );
    expect(item).toMatchObject({ per100g: null, sourceName: null, productId: null });
  });

  it('даёт строкам разные ключи', () => {
    const result = toDishIngredients(
      recognition([
        { name: 'А', grams: 10, matchedName: null, per100g: null },
        { name: 'А', grams: 20, matchedName: null, per100g: null },
      ]),
      [],
    );
    expect(result[0]?.key).not.toBe(result[1]?.key);
  });
});

describe('правка строк', () => {
  const list = [row({ key: 'k1' }), row({ key: 'k2', name: 'Б', gramsInput: '50' })];

  it('setIngredientGrams меняет только нужную строку и не трогает исходный массив', () => {
    const result = setIngredientGrams(list, 'k1', '200');
    expect(result).not.toBe(list);
    expect(result[0]?.gramsInput).toBe('200');
    expect(list[0]?.gramsInput).toBe('100');
    expect(result[1]).toBe(list[1]);
  });

  it('setIngredientProduct берёт КБЖУ из своего продукта', () => {
    const product: OwnProduct = { id: 'p1', name: 'Продукт', per100g: BUTTER };
    const result = setIngredientProduct([row({ per100g: null })], 'k1', product);
    expect(result[0]).toMatchObject({ per100g: BUTTER, sourceName: 'Продукт', productId: 'p1' });
  });

  it('setIngredientProduct с null сбрасывает КБЖУ и не трогает другие строки', () => {
    const result = setIngredientProduct(list, 'k1', null);
    expect(result[0]).toMatchObject({ per100g: null, sourceName: null, productId: null });
    expect(result[1]).toBe(list[1]);
  });

  it('removeIngredient убирает строку по ключу', () => {
    expect(removeIngredient(list, 'k1').map((item) => item.key)).toEqual(['k2']);
  });
});

describe('ingredientGrams', () => {
  it.each([
    ['150', 150],
    ['12,5', 12.5],
  ])('принимает «%s»', (gramsInput, expected) => {
    expect(ingredientGrams(row({ gramsInput }))).toBeCloseTo(expected);
  });

  it.each(['0', '-5', '', 'abc'])('отвергает «%s»', (gramsInput) => {
    expect(ingredientGrams(row({ gramsInput }))).toBeNull();
  });
});

describe('dishTotals', () => {
  it('складывает вес и КБЖУ и считает КБЖУ на 100 г блюда', () => {
    const totals = dishTotals([
      row({ key: 'k1', gramsInput: '200', per100g: BUCKWHEAT }),
      row({ key: 'k2', gramsInput: '10', per100g: BUTTER }),
    ]);
    expect(totals.grams).toBe(210);
    expect(totals.nutrients.kcal).toBeCloseTo(294.8);
    expect(totals.nutrients.fat).toBeCloseTo(10.45);
    expect(totals.per100g.kcal).toBeCloseTo(140.38, 1);
    expect(totals.unresolved).toBe(0);
    expect(totals.invalid).toBe(0);
  });

  it('строка без КБЖУ не входит в суммы и считается нерешённой', () => {
    const totals = dishTotals([row({ key: 'k1' }), row({ key: 'k2', per100g: null })]);
    expect(totals.unresolved).toBe(1);
    expect(totals.grams).toBe(100);
    expect(totals.nutrients.kcal).toBeCloseTo(100);
  });

  it('строка с негодными граммами не входит в суммы и считается ошибочной', () => {
    const totals = dishTotals([row({ key: 'k1' }), row({ key: 'k2', gramsInput: '-5' })]);
    expect(totals.invalid).toBe(1);
    expect(totals.grams).toBe(100);
  });

  it('для пустого списка — нули', () => {
    expect(dishTotals([])).toEqual({
      grams: 0,
      nutrients: EMPTY_NUTRIENTS,
      per100g: EMPTY_NUTRIENTS,
      unresolved: 0,
      invalid: 0,
    });
  });
});

describe('canSaveDish', () => {
  it('нельзя без названия', () => {
    expect(canSaveDish('   ', [row()])).toBe(false);
  });

  it('нельзя без ингредиентов', () => {
    expect(canSaveDish('Блюдо', [])).toBe(false);
  });

  it('нельзя, пока у ингредиента нет КБЖУ', () => {
    expect(canSaveDish('Блюдо', [row({ per100g: null })])).toBe(false);
  });

  it('нельзя с негодными граммами', () => {
    expect(canSaveDish('Блюдо', [row({ gramsInput: '0' })])).toBe(false);
  });

  it('можно, когда всё заполнено', () => {
    expect(canSaveDish('Блюдо', [row()])).toBe(true);
  });
});
