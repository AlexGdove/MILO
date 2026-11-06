import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

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
    expect(screen.getByText(/нет регистрации, имени и контактов/)).toBeInTheDocument();
  });
});
