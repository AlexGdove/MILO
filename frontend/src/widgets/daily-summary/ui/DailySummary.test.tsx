import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useMealEntryStore } from '@/entities/meal-entry';
import { useUserGoalStore } from '@/entities/user-goal';

import { DailySummary } from './DailySummary';

const DATE = '2026-11-04';

const addEntry = (grams: number, date = DATE) =>
  useMealEntryStore.getState().addEntry({
    date,
    mealType: 'lunch',
    productId: 'p1',
    productName: 'Сырники',
    per100g: { kcal: 220, protein: 15.5, fat: 9, carbs: 20 },
    grams,
    stockDeducted: 0,
  });

beforeEach(() => {
  useMealEntryStore.setState(useMealEntryStore.getInitialState(), true);
  useUserGoalStore.setState(useUserGoalStore.getInitialState(), true);
});

describe('DailySummary', () => {
  it('показывает съеденное, остаток до цели и прогресс БЖУ за выбранный день', () => {
    addEntry(200);
    addEntry(1000, '2026-11-03'); // другой день не учитывается
    render(<DailySummary date={DATE} />);

    expect(screen.getByText('440')).toBeInTheDocument();
    expect(screen.getByText('1560')).toBeInTheDocument();
    expect(screen.getByText('ккал осталось')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Белки' })).toHaveAttribute(
      'aria-valuenow',
      '31',
    );
    expect(screen.getByRole('progressbar', { name: 'Углеводы' })).toHaveAttribute(
      'aria-valuemax',
      '250',
    );
  });

  it('при превышении цели показывает «ккал сверх»', () => {
    useUserGoalStore.getState().setGoal({ kcal: 300, protein: 100, fat: 70, carbs: 250 });
    addEntry(200);
    render(<DailySummary date={DATE} />);

    expect(screen.getByText('140')).toBeInTheDocument();
    expect(screen.getByText('ккал сверх')).toBeInTheDocument();
  });
});
