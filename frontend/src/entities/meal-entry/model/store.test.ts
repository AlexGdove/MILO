import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';

import { entryNutrients, totalNutrients, useDayEntries, useMealEntryStore } from './store';
import type { MealEntryDraft } from './types';

const makeDraft = (overrides: Partial<MealEntryDraft> = {}): MealEntryDraft => ({
  date: '2026-11-04',
  mealType: 'lunch',
  source: { type: 'product', id: 'p1' },
  productName: 'Сырники',
  per100g: { kcal: 220, protein: 15.5, fat: 9, carbs: 20 },
  amount: 200,
  unit: 'g',
  grams: 200,
  stockDeducted: 0,
  ...overrides,
});

const state = () => useMealEntryStore.getState();

beforeEach(() => {
  useMealEntryStore.setState(useMealEntryStore.getInitialState(), true);
});

describe('useMealEntryStore', () => {
  it('изначально пуст', () => {
    expect(state().entries).toEqual([]);
  });

  it('addEntry сохраняет снимок продукта и возвращает запись', () => {
    const entry = state().addEntry(makeDraft());
    expect(entry).toMatchObject(makeDraft());
    expect(entry.id).toEqual(expect.any(String));
    expect(state().entries).toEqual([entry]);
  });

  it('removeEntry удаляет запись и возвращает её (для возврата остатка)', () => {
    const entry = state().addEntry(makeDraft({ stockDeducted: 150 }));
    const removed = state().removeEntry(entry.id);
    expect(removed).toEqual(entry);
    expect(state().entries).toEqual([]);
  });

  it('removeEntry для неизвестного id возвращает undefined и ничего не меняет', () => {
    const entry = state().addEntry(makeDraft());
    expect(state().removeEntry('nope')).toBeUndefined();
    expect(state().entries).toEqual([entry]);
  });
});

describe('расчёт КБЖУ записей', () => {
  it('entryNutrients считает по весу записи', () => {
    const entry = state().addEntry(makeDraft());
    expect(entryNutrients(entry)).toEqual({ kcal: 440, protein: 31, fat: 18, carbs: 40 });
  });

  it('totalNutrients суммирует записи', () => {
    const a = state().addEntry(makeDraft());
    const b = state().addEntry(
      makeDraft({
        productName: 'Банан',
        per100g: { kcal: 96, protein: 1.5, fat: 0.5, carbs: 21 },
        amount: 120,
        grams: 120,
      }),
    );
    const total = totalNutrients([a, b]);
    expect(total.kcal).toBeCloseTo(440 + 115.2);
    expect(total.carbs).toBeCloseTo(40 + 25.2);
  });
});

describe('useDayEntries', () => {
  it('возвращает только записи выбранного дня и обновляется при добавлении', () => {
    state().addEntry(makeDraft({ date: '2026-11-03' }));
    const { result } = renderHook(() => useDayEntries('2026-11-04'));
    expect(result.current).toEqual([]);

    act(() => {
      state().addEntry(makeDraft());
    });

    expect(result.current).toHaveLength(1);
    expect(result.current[0]?.date).toBe('2026-11-04');
  });

  it('возвращает тот же массив, пока записи не менялись (без лишних ререндеров)', () => {
    state().addEntry(makeDraft());
    const { result, rerender } = renderHook(() => useDayEntries('2026-11-04'));
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
