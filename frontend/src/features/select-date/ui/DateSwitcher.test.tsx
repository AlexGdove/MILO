import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { todayIsoDate } from '@/shared/lib';

import { DateSwitcher } from './DateSwitcher';
import { useSelectedDateStore } from '../model/store';

beforeEach(() => {
  useSelectedDateStore.setState({ date: todayIsoDate() });
});

describe('DateSwitcher', () => {
  it('по умолчанию показывает «Сегодня», кнопка возврата неактивна', () => {
    render(<DateSwitcher />);
    expect(screen.getByRole('button', { name: 'Сегодня' })).toBeDisabled();
  });

  it('листает дни назад и вперёд', async () => {
    const user = userEvent.setup();
    render(<DateSwitcher />);

    await user.click(screen.getByRole('button', { name: 'Предыдущий день' }));
    expect(screen.getByRole('button', { name: 'Вчера' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Следующий день' }));
    await user.click(screen.getByRole('button', { name: 'Следующий день' }));
    expect(screen.getByRole('button', { name: 'Завтра' })).toBeInTheDocument();
  });

  it('возвращает к сегодняшнему дню по нажатию на дату', async () => {
    const user = userEvent.setup();
    render(<DateSwitcher />);

    await user.click(screen.getByRole('button', { name: 'Предыдущий день' }));
    await user.click(screen.getByRole('button', { name: 'Предыдущий день' }));
    await user.click(screen.getByRole('button', { name: /ноября|октября|декабря|\d/ }));

    expect(useSelectedDateStore.getState().date).toBe(todayIsoDate());
  });
});
