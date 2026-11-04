import { describe, expect, it } from 'vitest';

import {
  EMPTY_NUTRIENTS,
  formatGrams,
  formatKcal,
  nutrientsForGrams,
  sumNutrients,
  type Nutrients,
} from './nutrition';

const cheesecakes: Nutrients = { kcal: 220, protein: 15.5, fat: 9, carbs: 20 };

describe('nutrientsForGrams', () => {
  it('пересчитывает значения на 100 г на указанный вес', () => {
    expect(nutrientsForGrams(cheesecakes, 200)).toEqual({
      kcal: 440,
      protein: 31,
      fat: 18,
      carbs: 40,
    });
  });

  it('для 100 г возвращает исходные значения', () => {
    expect(nutrientsForGrams(cheesecakes, 100)).toEqual(cheesecakes);
  });

  it('для 0 г возвращает нули', () => {
    expect(nutrientsForGrams(cheesecakes, 0)).toEqual(EMPTY_NUTRIENTS);
  });

  it('работает с дробным весом', () => {
    const result = nutrientsForGrams({ kcal: 52, protein: 2.8, fat: 2.5, carbs: 4.7 }, 250);
    expect(result.kcal).toBeCloseTo(130);
    expect(result.protein).toBeCloseTo(7);
    expect(result.fat).toBeCloseTo(6.25);
    expect(result.carbs).toBeCloseTo(11.75);
  });
});

describe('sumNutrients', () => {
  it('для пустого списка возвращает нули', () => {
    expect(sumNutrients([])).toEqual(EMPTY_NUTRIENTS);
  });

  it('складывает каждое поле', () => {
    expect(
      sumNutrients([
        { kcal: 100, protein: 1, fat: 2, carbs: 3 },
        { kcal: 50, protein: 0.5, fat: 0, carbs: 10 },
      ]),
    ).toEqual({ kcal: 150, protein: 1.5, fat: 2, carbs: 13 });
  });

  it('не изменяет общий объект EMPTY_NUTRIENTS', () => {
    sumNutrients([{ kcal: 10, protein: 1, fat: 1, carbs: 1 }]);
    expect(EMPTY_NUTRIENTS).toEqual({ kcal: 0, protein: 0, fat: 0, carbs: 0 });
  });
});

describe('форматирование', () => {
  it.each([
    [439.5, '440'],
    [439.4, '439'],
    [0, '0'],
  ])('formatKcal(%s) = %s', (value, expected) => {
    expect(formatKcal(value)).toBe(expected);
  });

  it.each([
    [15.5, '15,5'],
    [31, '31'],
    [6.25, '6,3'],
    [0.04, '0'],
  ])('formatGrams(%s) = %s (запятая как разделитель)', (value, expected) => {
    expect(formatGrams(value)).toBe(expected);
  });
});
