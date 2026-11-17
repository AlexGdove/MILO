import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useMealEntryStore } from '@/entities/meal-entry';
import { useUserGoalStore } from '@/entities/user-goal';
import { useSelectedDateStore } from '@/features/select-date';

import { WeekCalendar } from './WeekCalendar';

const addEntry = (date: string, grams: number) =>
  useMealEntryStore.getState().addEntry({
    date,
    mealType: 'lunch',
    source: { type: 'product', id: 'p1' },
    productName: 'Гречка',
    per100g: { kcal: 100, protein: 4, fat: 1, carbs: 20 },
    amount: grams,
    unit: 'g',
    grams,
    stockDeducted: 0,
  });

const setupUser = () => userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
const selectedDate = () => useSelectedDateStore.getState().date;

beforeEach(() => {
  // «Сегодня» — среда 18 ноября 2026
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date(2026, 10, 18, 12));
  useMealEntryStore.setState(useMealEntryStore.getInitialState(), true);
  useUserGoalStore.setState(useUserGoalStore.getInitialState(), true);
  useSelectedDateStore.setState({ date: '2026-11-18' });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('WeekCalendar', () => {
  it('показывает неделю Пн–Вс и выделяет выбранный день', () => {
    render(<WeekCalendar />);

    expect(screen.getAllByRole('listitem')).toHaveLength(7);
    expect(screen.getByRole('button', { name: /^понедельник, 16 ноября/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^воскресенье, 22 ноября/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^среда, 18 ноября/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: /^четверг, 19 ноября/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('точка дня: пусто, в норме или перебор по калориям', () => {
    addEntry('2026-11-16', 1500); // 1500 ккал при норме 2000
    addEntry('2026-11-17', 2500); // 2500 ккал — больше нормы
    render(<WeekCalendar />);

    const monday = screen.getByRole('button', {
      name: /^понедельник, 16 ноября: в пределах нормы$/,
    });
    const tuesday = screen.getByRole('button', { name: /^вторник, 17 ноября: больше нормы$/ });
    const thursday = screen.getByRole('button', {
      name: /^четверг, 19 ноября: ничего не отмечено$/,
    });

    expect(monday.querySelector('[data-status]')?.getAttribute('data-status')).toBe('ok');
    expect(tuesday.querySelector('[data-status]')?.getAttribute('data-status')).toBe('over');
    expect(thursday.querySelector('[data-status]')?.getAttribute('data-status')).toBe('empty');
  });

  it('нажатие на день выбирает его, «Сегодня» возвращает к текущему дню', async () => {
    const user = setupUser();
    render(<WeekCalendar />);
    expect(screen.queryByRole('button', { name: 'Сегодня' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^пятница, 20 ноября/ }));
    expect(selectedDate()).toBe('2026-11-20');

    await user.click(await screen.findByRole('button', { name: 'Сегодня' }));
    expect(selectedDate()).toBe('2026-11-18');
    expect(screen.queryByRole('button', { name: 'Сегодня' })).not.toBeInTheDocument();
  });

  it('стрелки листают неделями', async () => {
    const user = setupUser();
    render(<WeekCalendar />);

    await user.click(screen.getByRole('button', { name: 'Следующая неделя' }));
    expect(selectedDate()).toBe('2026-11-25');
    expect(screen.getByRole('button', { name: /^понедельник, 23 ноября/ })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Предыдущая неделя' }));
    await user.click(screen.getByRole('button', { name: 'Предыдущая неделя' }));
    expect(selectedDate()).toBe('2026-11-11');
  });

  it('свайп по полосе дней листает неделями: влево — следующая, вправо — прошлая', () => {
    render(<WeekCalendar />);
    const strip = screen.getAllByRole('list')[0];
    if (!strip) throw new Error('нет полосы дней');
    expect(strip).toHaveAttribute('data-no-swipe');

    const swipe = (fromX: number, toX: number) => {
      fireEvent.touchStart(strip, { touches: [{ clientX: fromX, clientY: 100 }] });
      fireEvent.touchEnd(strip, { changedTouches: [{ clientX: toX, clientY: 100 }] });
    };

    swipe(300, 100);
    expect(selectedDate()).toBe('2026-11-25');
    swipe(100, 300);
    swipe(100, 300);
    expect(selectedDate()).toBe('2026-11-11');
    swipe(200, 180); // короткое движение — не свайп
    expect(selectedDate()).toBe('2026-11-11');
  });
});
