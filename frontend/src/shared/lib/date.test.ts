import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { formatDayLabel, fromIsoDate, shiftIsoDate, todayIsoDate, toIsoDate } from './date';

describe('toIsoDate / fromIsoDate', () => {
  it('форматирует дату по локальному времени с ведущими нулями', () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('fromIsoDate возвращает локальную полночь нужного дня', () => {
    const date = fromIsoDate('2026-11-04');
    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([
      2026, 10, 4, 0,
    ]);
  });

  it('преобразования взаимно обратны', () => {
    expect(toIsoDate(fromIsoDate('2024-02-29'))).toBe('2024-02-29');
  });
});

describe('shiftIsoDate', () => {
  it.each([
    ['2026-11-04', 1, '2026-11-05'],
    ['2026-11-04', -1, '2026-11-03'],
    ['2026-11-30', 1, '2026-12-01'],
    ['2026-12-31', 1, '2027-01-01'],
    ['2026-01-01', -1, '2025-12-31'],
    ['2024-02-28', 1, '2024-02-29'],
    ['2025-02-28', 1, '2025-03-01'],
    ['2026-11-04', 0, '2026-11-04'],
  ])('%s со сдвигом %i = %s', (from, days, expected) => {
    expect(shiftIsoDate(from, days)).toBe(expected);
  });

  it('корректно проходит переход на летнее время (сдвиг на 7 дней)', () => {
    expect(shiftIsoDate('2026-03-25', 7)).toBe('2026-04-01');
  });
});

describe('относительные подписи дней', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 4, 12, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('todayIsoDate берёт текущую дату', () => {
    expect(todayIsoDate()).toBe('2026-11-04');
  });

  it.each([
    ['2026-11-04', 'Сегодня'],
    ['2026-11-03', 'Вчера'],
    ['2026-11-05', 'Завтра'],
  ])('%s → %s', (iso, label) => {
    expect(formatDayLabel(iso)).toBe(label);
  });

  it('остальные дни подписывает датой на русском', () => {
    const label = formatDayLabel('2026-11-01');
    expect(label).toContain('1');
    expect(label).toContain('ноября');
  });
});
