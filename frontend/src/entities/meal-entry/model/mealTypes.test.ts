import { describe, expect, it } from 'vitest';

import { MEAL_TYPES, mealTypeLabel, suggestMealType } from './mealTypes';

describe('suggestMealType', () => {
  const at = (hours: number, minutes = 0) => new Date(2026, 10, 4, hours, minutes);

  it.each([
    [at(6), 'breakfast'],
    [at(10, 59), 'breakfast'],
    [at(11), 'lunch'],
    [at(15, 59), 'lunch'],
    [at(16), 'dinner'],
    [at(20, 59), 'dinner'],
    [at(21), 'snack'],
    [at(0, 30), 'breakfast'],
  ])('%s → %s', (date, expected) => {
    expect(suggestMealType(date)).toBe(expected);
  });
});

describe('mealTypeLabel', () => {
  it('возвращает русские подписи', () => {
    expect(MEAL_TYPES.map((m) => mealTypeLabel(m.value))).toEqual([
      'Завтрак',
      'Обед',
      'Ужин',
      'Перекус',
    ]);
  });
});
