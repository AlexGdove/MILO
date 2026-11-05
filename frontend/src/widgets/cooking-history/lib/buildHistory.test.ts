import { describe, expect, it } from 'vitest';

import type { CookedDish } from '@/entities/cooked-dish';
import type { MealEntry } from '@/entities/meal-entry';

import { buildHistory } from './buildHistory';

const per100g = { kcal: 100, protein: 5, fat: 5, carbs: 10 };
const at = (iso: string, hour: number) =>
  new Date(`${iso}T${String(hour).padStart(2, '0')}:00:00`).getTime();
const dish = (id: string, iso: string, hour: number): CookedDish => ({
  id,
  recipeId: 'r',
  name: `Блюдо ${id}`,
  servingsTotal: 4,
  servingsLeft: 4,
  portionGrams: 200,
  per100g,
  cookedAt: at(iso, hour),
});
const entry = (id: string, iso: string, hour: number, type: 'product' | 'recipe'): MealEntry => ({
  id,
  date: iso,
  mealType: 'lunch',
  source: { type, id: 'd1' },
  productName: `Еда ${id}`,
  per100g,
  amount: 200,
  unit: 'g',
  grams: 200,
  stockDeducted: 1,
  createdAt: at(iso, hour),
});

describe('buildHistory', () => {
  it('пустые данные — пустая история', () => {
    expect(buildHistory([], [])).toEqual([]);
  });

  it('готовка и съеденное попадают в свой день', () => {
    const result = buildHistory(
      [dish('d1', '2026-11-04', 10)],
      [entry('e1', '2026-11-05', 13, 'recipe')],
    );
    expect(result.map((d) => d.date)).toEqual(['2026-11-05', '2026-11-04']);
    expect(result[0]?.events[0]).toMatchObject({
      kind: 'eaten',
      name: 'Еда e1',
      portions: 1,
      mealType: 'lunch',
    });
    expect(result[1]?.events[0]).toMatchObject({ kind: 'cooked', name: 'Блюдо d1', portions: 4 });
  });

  it('записи о продуктах не попадают в историю', () => {
    expect(buildHistory([], [entry('e1', '2026-11-05', 13, 'product')])).toEqual([]);
  });

  it('внутри дня новые события сверху', () => {
    const result = buildHistory(
      [dish('d1', '2026-11-05', 9)],
      [entry('e1', '2026-11-05', 19, 'recipe')],
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.events.map((e) => e.kind)).toEqual(['eaten', 'cooked']);
  });
});
