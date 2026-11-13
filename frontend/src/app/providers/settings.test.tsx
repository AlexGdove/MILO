import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useSessionStore, type Account } from '@/entities/account';
import { ProfilePage } from '@/pages/profile';
import { SettingsPage } from '@/pages/settings';
import { APP_VERSION, ROUTES } from '@/shared/config';

import { RootLayout } from '../layouts/RootLayout';

const renderAt = (path: string) => {
  const router = createMemoryRouter(
    [
      {
        element: <RootLayout />,
        children: [
          { path: ROUTES.profile, element: <ProfilePage /> },
          { path: ROUTES.settings, element: <SettingsPage /> },
        ],
      },
    ],
    { initialEntries: [path] },
  );
  render(<RouterProvider router={router} />);
  return { router, user: userEvent.setup() };
};

describe('Настройки (решение №43)', () => {
  it('шестерёнка в «Профиле» открывает настройки; «← Профиль» возвращает', async () => {
    const { router, user } = renderAt(ROUTES.profile);
    expect(screen.queryByRole('heading', { name: 'Оформление' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Настройки' }));
    expect(router.state.location.pathname).toBe(ROUTES.settings);
    expect(screen.getByRole('heading', { level: 1, name: 'Настройки' })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: '← Профиль' }));
    expect(router.state.location.pathname).toBe(ROUTES.profile);
  });

  it('кнопка настроек — в общей шапке на любой странице; на «Профиле» второй нет (№63)', () => {
    renderAt(ROUTES.profile);
    expect(screen.getAllByRole('link', { name: 'Настройки' })).toHaveLength(1);
    // Шапка приложения — та, где логотип (второй <header> — заголовок страницы)
    const appHeader = screen.getByRole('link', { name: 'MILO — на главную' }).closest('header');
    expect(appHeader).toContainElement(screen.getByRole('link', { name: 'Настройки' }));
  });

  it('в настройках есть переключатель отчётов об ошибках (решение №62)', async () => {
    const { user } = renderAt(ROUTES.settings);

    expect(screen.getByRole('heading', { name: 'Отчёты об ошибках' })).toBeInTheDocument();
    const reports = screen.getByRole('group', { name: 'Отчёты об ошибках' });
    expect(within(reports).getByRole('radio', { name: 'Отправлять' })).toBeChecked();
    await user.click(within(reports).getByRole('radio', { name: 'Не отправлять' }));
    expect(within(reports).getByRole('radio', { name: 'Не отправлять' })).toBeChecked();
  });

  it('в настройках: оформление (тема переключается), язык, техподдержка', async () => {
    const { user } = renderAt(ROUTES.settings);

    expect(screen.getByRole('heading', { name: 'Оформление' })).toBeInTheDocument();
    const theme = screen.getByRole('group', { name: 'Тема' });
    await user.click(within(theme).getByRole('radio', { name: 'Тёмная' }));
    // Применение темы к <html> (useApplyTheme в App) покрыто тестами ThemeSwitcher
    expect(within(theme).getByRole('radio', { name: 'Тёмная' })).toBeChecked();

    const language = screen.getByRole('combobox', { name: 'Язык интерфейса' });
    expect(language).toHaveValue('ru');
    expect(
      within(language)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Русский']);

    expect(screen.getByRole('heading', { name: 'Техподдержка' })).toBeInTheDocument();
  });

  it('внизу настроек — версия приложения из package.json (решение №48)', () => {
    renderAt(ROUTES.settings);
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(screen.getByText(`MILO ${APP_VERSION}`)).toBeInTheDocument();
  });

  it('в настройках — «Данные и конфиденциальность» (решение №50)', () => {
    renderAt(ROUTES.settings);
    expect(
      screen.getByRole('heading', { name: 'Данные и конфиденциальность' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/почта, пароль в зашифрованном виде и тариф/)).toBeInTheDocument();
  });
});

describe('Аккаунт в настройках (просьба владельца 2026-11-13)', () => {
  const TOKEN = `ms_${'A'.repeat(43)}`;
  const ACCOUNT: Account = { id: 'a1', email: 'anna@example.com', plan: 'free', planUntil: null };

  beforeEach(() => {
    localStorage.clear();
    useSessionStore.setState({ token: null, account: null });
  });

  afterEach(() => {
    useSessionStore.setState({ token: null, account: null });
  });

  it('не вошли — карточки аккаунта нет, вход только на «Профиле»', () => {
    renderAt(ROUTES.settings);

    expect(screen.queryByRole('heading', { name: 'Аккаунт' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Войти или зарегистрироваться' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Управление аккаунтом' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Сменить пароль' })).not.toBeInTheDocument();
  });

  it('вошли — смена пароля и удаление аккаунта', () => {
    useSessionStore.setState({ token: TOKEN, account: ACCOUNT });
    renderAt(ROUTES.settings);

    expect(screen.getByRole('heading', { name: 'Аккаунт' })).toBeInTheDocument();
    expect(screen.getByText('Вы вошли как anna@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Сменить пароль' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Удалить аккаунт' })).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Войти или зарегистрироваться' }),
    ).not.toBeInTheDocument();
  });
});
