import { describe, expect, it } from 'vitest';

import { MEAL_ENTRIES_STORAGE_VERSION, migrateMealEntries } from './migrations';

const v1Entry = {
  id: 'e1',
  date: '2026-11-04',
  mealType: 'lunch',
  productId: 'p1',
  productName: 'Сырники',
  per100g: { kcal: 220, protein: 15.5, fat: 9, carbs: 20 },
  grams: 200,
  stockDeducted: 150,
  createdAt: 1,
};

describe('migrateMealEntries', () => {
  it('текущая версия — 2', () => {
    expect(MEAL_ENTRIES_STORAGE_VERSION).toBe(2);
  });

  it('v1 → v2: productId становится source, граммы — количеством в «г»', () => {
    const { entries } = migrateMealEntries({ entries: [v1Entry] }, 1);
    expect(entries).toEqual([
      {
        id: 'e1',
        date: '2026-11-04',
        mealType: 'lunch',
        source: { type: 'product', id: 'p1' },
        productName: 'Сырники',
        per100g: { kcal: 220, protein: 15.5, fat: 9, carbs: 20 },
        amount: 200,
        unit: 'g',
        grams: 200,
        stockDeducted: 150,
        createdAt: 1,
      },
    ]);
    expect(entries[0]).not.toHaveProperty('productId');
  });

  it('v2: сохраняет запись блюда по рецепту', () => {
    const v2Entry = {
      id: 'e2',
      date: '2026-11-04',
      mealType: 'dinner',
      source: { type: 'recipe', id: 'r1' },
      productName: 'Омлет',
      per100g: { kcal: 150, protein: 10, fat: 11, carbs: 2 },
      amount: 1,
      unit: 'pcs',
      grams: 180,
      stockDeducted: 0,
      createdAt: 2,
    };
    expect(migrateMealEntries({ entries: [v2Entry] }, 2).entries).toEqual([v2Entry]);
  });

  it('неизвестный приём пищи становится перекусом', () => {
    const { entries } = migrateMealEntries({ entries: [{ ...v1Entry, mealType: 'brunch' }] }, 1);
    expect(entries[0]?.mealType).toBe('snack');
  });

  it('отбрасывает записи без даты или источника', () => {
    const { entries } = migrateMealEntries(
      {
        entries: [{ ...v1Entry, date: 5 }, { ...v1Entry, id: 'e3', productId: undefined }, v1Entry],
      },
      1,
    );
    expect(entries.map((e) => e.id)).toEqual(['e1']);
  });

  it('пустое или битое состояние', () => {
    expect(migrateMealEntries(null, 1)).toEqual({ entries: [] });
  });
});
