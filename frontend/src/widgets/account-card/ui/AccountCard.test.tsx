import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { useSessionStore, type Account } from '@/entities/account';

import { AccountCard } from './AccountCard';

const TOKEN = `ms_${'A'.repeat(43)}`;
const ACCOUNT: Account = { id: 'a1', email: 'anna@example.com', plan: 'plus', planUntil: null };

beforeEach(() => {
  localStorage.clear();
  useSessionStore.setState({ token: null, account: null });
});

describe('AccountCard', () => {
  it('не вошли — ссылки на вход и регистрацию', () => {
    render(<AccountCard />, { wrapper: MemoryRouter });

    expect(screen.getByRole('heading', { name: 'Аккаунт MILO' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Войти' })).toHaveAttribute(
      'href',
      '/settings/account?from=profile',
    );
    expect(screen.getByRole('link', { name: 'Создать аккаунт' })).toHaveAttribute(
      'href',
      '/settings/account?step=register&from=profile',
    );
  });

  it('вошли — почта, тариф и управление аккаунтом', () => {
    useSessionStore.setState({ token: TOKEN, account: ACCOUNT });
    render(<AccountCard />, { wrapper: MemoryRouter });

    expect(screen.getByRole('heading', { name: 'anna@example.com' })).toBeInTheDocument();
    expect(screen.getByText('Plus')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Управление аккаунтом →' })).toHaveAttribute(
      'href',
      '/settings/account?from=profile',
    );
    expect(screen.queryByRole('link', { name: 'Войти' })).not.toBeInTheDocument();
  });

  it('токен без аккаунта — как будто не входили', () => {
    useSessionStore.setState({ token: TOKEN, account: null });
    render(<AccountCard />, { wrapper: MemoryRouter });

    expect(screen.getByRole('link', { name: 'Войти' })).toBeInTheDocument();
  });
});
