import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { accountApi, useSessionStore, type Account } from '@/entities/account';
import { ApiError } from '@/shared/api';

import { AccountPage } from './AccountPage';

const TOKEN = `ms_${'A'.repeat(43)}`;
const ACCOUNT: Account = { id: 'a1', email: 'anna@example.com', plan: 'free', planUntil: null };
const SESSION = { token: TOKEN, account: ACCOUNT };
const SENT = { expiresInSeconds: 600 };

const renderPage = () =>
  render(
    <MemoryRouter>
      <AccountPage />
    </MemoryRouter>,
  );

const type = async (label: string, value: string) => {
  await userEvent.setup().type(screen.getByLabelText(label), value);
};
const click = async (name: string) => {
  await userEvent.setup().click(screen.getByRole('button', { name }));
};

beforeEach(() => {
  localStorage.clear();
  useSessionStore.setState({ token: null, account: null });
  vi.spyOn(accountApi, 'me').mockResolvedValue(ACCOUNT);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AccountPage', () => {
  it('вход паролем → почта и тариф', async () => {
    const login = vi.spyOn(accountApi, 'login').mockResolvedValue(SESSION);
    renderPage();

    await type('Почта', 'anna@example.com');
    await type('Пароль', 'correct horse');
    await click('Войти');

    expect(login).toHaveBeenCalledWith('anna@example.com', 'correct horse');
    expect(await screen.findByRole('heading', { name: 'anna@example.com' })).toBeInTheDocument();
    expect(screen.getByText('Бесплатный')).toBeInTheDocument();
    expect(useSessionStore.getState().token).toBe(TOKEN);
  });

  it('почта не подтверждена → новый код и шаг подтверждения → вход', async () => {
    vi.spyOn(accountApi, 'login').mockRejectedValue(new ApiError(403, 'email_not_verified', 'x'));
    const resend = vi.spyOn(accountApi, 'resendCode').mockResolvedValue(SENT);
    const verify = vi.spyOn(accountApi, 'verifyEmail').mockResolvedValue(SESSION);
    renderPage();

    await type('Почта', 'anna@example.com');
    await type('Пароль', 'correct horse');
    await click('Войти');

    expect(await screen.findByRole('heading', { name: 'Подтвердите почту' })).toBeInTheDocument();
    expect(resend).toHaveBeenCalledWith('anna@example.com');
    await type('Код из письма', '123456');
    await click('Подтвердить');

    expect(verify).toHaveBeenCalledWith('anna@example.com', '123456');
    expect(await screen.findByRole('button', { name: 'Выйти' })).toBeInTheDocument();
  });

  it('регистрация → код → вход', async () => {
    const register = vi.spyOn(accountApi, 'register').mockResolvedValue(SENT);
    vi.spyOn(accountApi, 'verifyEmail').mockResolvedValue(SESSION);
    renderPage();

    await click('Создать аккаунт');
    await type('Почта', 'anna@example.com');
    await type('Пароль', 'correct horse');
    await type('Повторите пароль', 'correct horse');
    await click('Зарегистрироваться');

    expect(register).toHaveBeenCalledWith('anna@example.com', 'correct horse');
    expect(await screen.findByText(/Мы отправили код на anna@example\.com/)).toBeInTheDocument();
    await type('Код из письма', '654321');
    await click('Подтвердить');
    expect(await screen.findByRole('button', { name: 'Выйти' })).toBeInTheDocument();
  });

  it('забыли пароль → код и новый пароль → вход', async () => {
    const forgot = vi.spyOn(accountApi, 'forgotPassword').mockResolvedValue(SENT);
    const reset = vi.spyOn(accountApi, 'resetPassword').mockResolvedValue(SESSION);
    renderPage();

    await click('Забыли пароль?');
    await type('Почта', 'anna@example.com');
    await click('Получить код');
    expect(forgot).toHaveBeenCalledWith('anna@example.com');

    await type('Код из письма', '111222');
    await type('Новый пароль', 'brand new pass');
    await type('Повторите пароль', 'brand new pass');
    await click('Сохранить пароль');

    expect(reset).toHaveBeenCalledWith('anna@example.com', '111222', 'brand new pass');
    expect(await screen.findByRole('button', { name: 'Выйти' })).toBeInTheDocument();
  });

  describe('после входа', () => {
    beforeEach(() => useSessionStore.getState().signIn(SESSION));

    it('тариф обновляется с сервера', async () => {
      vi.spyOn(accountApi, 'me').mockResolvedValue({
        ...ACCOUNT,
        plan: 'plus',
        planUntil: '2026-12-01T00:00:00.000Z',
      });
      renderPage();
      expect(await screen.findByText('Plus')).toBeInTheDocument();
      expect(screen.getByText(/до 1 декабря 2026/)).toBeInTheDocument();
    });

    it('сессия больше не действует (401) → выход на устройстве', async () => {
      vi.spyOn(accountApi, 'me').mockRejectedValue(new ApiError(401, 'session_invalid', 'x'));
      renderPage();
      expect(await screen.findByRole('heading', { name: 'Вход' })).toBeInTheDocument();
      expect(useSessionStore.getState().token).toBeNull();
    });

    it('сервер недоступен — сессия сохраняется', async () => {
      const me = vi
        .spyOn(accountApi, 'me')
        .mockRejectedValue(new ApiError(0, 'network_error', 'x'));
      renderPage();
      await vi.waitFor(() => expect(me).toHaveBeenCalled());
      expect(screen.getByRole('button', { name: 'Выйти' })).toBeInTheDocument();
      expect(useSessionStore.getState().token).toBe(TOKEN);
    });

    it('выход закрывает сессию на сервере и на устройстве (даже без сети)', async () => {
      const logout = vi
        .spyOn(accountApi, 'logout')
        .mockRejectedValue(new ApiError(0, 'network_error', 'x'));
      renderPage();
      await click('Выйти');

      expect(logout).toHaveBeenCalledWith(TOKEN);
      expect(await screen.findByRole('heading', { name: 'Вход' })).toBeInTheDocument();
      expect(useSessionStore.getState().token).toBeNull();
    });

    it('удаление — после подтверждения; ошибка показывается, сессия остаётся', async () => {
      const remove = vi
        .spyOn(accountApi, 'remove')
        .mockRejectedValueOnce(new ApiError(0, 'network_error', 'x'))
        .mockResolvedValueOnce(undefined);
      renderPage();

      await click('Удалить аккаунт');
      expect(remove).not.toHaveBeenCalled();
      await click('Удалить навсегда');
      expect(await screen.findByRole('alert')).toHaveTextContent('Нет связи с сервером');
      expect(useSessionStore.getState().token).toBe(TOKEN);

      await click('Удалить навсегда');
      expect(remove).toHaveBeenCalledTimes(2);
      expect(await screen.findByRole('heading', { name: 'Вход' })).toBeInTheDocument();
      expect(useSessionStore.getState().token).toBeNull();
    });
  });
});
