import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { accountApi, useSessionStore, type Account } from '@/entities/account';
import { ApiError } from '@/shared/api';

import { ChangePassword } from './ChangePassword';

const TOKEN = `ms_${'B'.repeat(43)}`;
const ACCOUNT: Account = { id: 'a1', email: 'anna@example.com', plan: 'free', planUntil: null };
const SENT = { expiresInSeconds: 600 };

beforeEach(() => {
  localStorage.clear();
  useSessionStore.setState({ token: null, account: null });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ChangePassword', () => {
  it('код на почту → новый пароль → «Пароль изменён», новая сессия', async () => {
    const forgot = vi.spyOn(accountApi, 'forgotPassword').mockResolvedValue(SENT);
    const reset = vi
      .spyOn(accountApi, 'resetPassword')
      .mockResolvedValue({ token: TOKEN, account: ACCOUNT });
    render(<ChangePassword email="anna@example.com" />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Сменить пароль' }));
    expect(forgot).toHaveBeenCalledWith('anna@example.com');

    await user.type(await screen.findByLabelText('Код из письма'), '123456');
    await user.type(screen.getByLabelText('Новый пароль'), 'new password 1');
    await user.type(screen.getByLabelText('Повторите пароль'), 'new password 1');
    await user.click(screen.getByRole('button', { name: 'Сохранить пароль' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Пароль изменён');
    expect(reset).toHaveBeenCalledWith('anna@example.com', '123456', 'new password 1');
    expect(useSessionStore.getState().token).toBe(TOKEN);
  });

  it('«Отмена» возвращает кнопку', async () => {
    vi.spyOn(accountApi, 'forgotPassword').mockResolvedValue(SENT);
    render(<ChangePassword email="anna@example.com" />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Сменить пароль' }));
    await screen.findByLabelText('Код из письма');
    await user.click(screen.getByRole('button', { name: 'Отмена' }));

    expect(screen.getByRole('button', { name: 'Сменить пароль' })).toBeInTheDocument();
  });

  it('ошибка отправки кода — текст ошибки, кнопка остаётся', async () => {
    vi.spyOn(accountApi, 'forgotPassword').mockRejectedValue(new ApiError(0, 'network_error', 'x'));
    render(<ChangePassword email="anna@example.com" />);

    await userEvent.setup().click(screen.getByRole('button', { name: 'Сменить пароль' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Нет связи с сервером');
    expect(screen.getByRole('button', { name: 'Сменить пароль' })).toBeInTheDocument();
  });
});
