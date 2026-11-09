import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Платформа Capacitor подменена: браузер или мобильное приложение
const platform = vi.hoisted(() => ({ native: false }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => platform.native } }));

import { useMealEntryStore } from '@/entities/meal-entry';
import { useUserGoalStore } from '@/entities/user-goal';
import { todayIsoDate } from '@/shared/lib';

import { AppHeader } from './AppHeader';

const per100g = { kcal: 100, protein: 0, fat: 0, carbs: 0 };

const addEaten = (kcal: number, date = todayIsoDate()) =>
  useMealEntryStore.getState().addEntry({
    date,
    mealType: 'lunch',
    source: { type: 'product', id: 'p' },
    productName: 'Еда',
    per100g,
    amount: kcal,
    unit: 'g',
    grams: kcal, // 100 ккал на 100 г → граммы = ккал
    stockDeducted: 0,
  });

const renderHeader = () => {
  const router = createMemoryRouter([{ path: '*', element: <AppHeader /> }]);
  render(<RouterProvider router={router} />);
};

beforeEach(() => {
  platform.native = false;
  useMealEntryStore.setState(useMealEntryStore.getInitialState(), true);
  useUserGoalStore.setState(useUserGoalStore.getInitialState(), true);
  useUserGoalStore.getState().setGoal({ kcal: 2000, protein: 100, fat: 70, carbs: 250 });
});

describe('AppHeader', () => {
  it('логотип ведёт на «Сегодня», кнопка — на страницу «Приложение»', () => {
    renderHeader();
    expect(screen.getByRole('link', { name: 'MILO — на главную' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Приложение' })).toHaveAttribute('href', '/app');
  });

  it('в мобильном приложении кнопки «Приложение» нет — оно уже установлено', () => {
    platform.native = true;
    renderHeader();
    expect(screen.queryByRole('link', { name: 'Приложение' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'MILO — на главную' })).toBeInTheDocument();
  });

  it('рядом с «Приложением» — кнопка настроек, ведёт на /settings (№63)', () => {
    renderHeader();
    const links = screen.getAllByRole('link').map((link) => link.getAttribute('aria-label'));
    expect(links.indexOf('Настройки')).toBe(links.indexOf('Приложение') + 1);
    expect(screen.getByRole('link', { name: 'Настройки' })).toHaveAttribute('href', '/settings');
  });

  it('в мобильном приложении остаются настройки, скачивания нет', () => {
    platform.native = true;
    renderHeader();
    expect(screen.getByRole('link', { name: 'Настройки' })).toHaveAttribute('href', '/settings');
    expect(screen.queryByRole('link', { name: 'Приложение' })).not.toBeInTheDocument();
  });

  it('счётчик показывает съеденное сегодня из нормы (вчерашнее не считается)', () => {
    addEaten(1240);
    addEaten(500, '2000-01-01');
    renderHeader();
    const counter = screen.getByRole('link', { name: /Сегодня съедено/ });
    // toLocaleString('ru-RU') разделяет разряды неразрывным пробелом
    expect(counter).toHaveAccessibleName(/^Сегодня съедено 1\s240 из 2\s000 ккал$/);
    expect(counter).toHaveAttribute('href', '/');
    expect(counter).toHaveTextContent(/1\s240 \/ 2\s000 ккал/);
  });

  it('при превышении нормы счётчик помечается', () => {
    addEaten(2300);
    renderHeader();
    expect(screen.getByRole('link', { name: /Сегодня съедено/ }).className).toMatch(/counterOver/);
  });
});
