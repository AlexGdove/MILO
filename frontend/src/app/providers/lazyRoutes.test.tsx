import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// jsdom не реализует matchMedia, а модуль установки приложения проверяет режим standalone при импорте
vi.hoisted(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
});

import { useUserProfileStore } from '@/entities/user-profile';
import { ROUTES } from '@/shared/config';

import { appRoutes } from './routes';

const renderAt = (path: string) => {
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
};

beforeEach(() => {
  useUserProfileStore.setState({ onboarding: 'done' });
});

/** Редкие страницы грузятся отдельными файлами по требованию — и при этом открываются. */
describe('страницы по требованию (слабые устройства)', () => {
  it('прямой адрес настроек — страница догружается и открывается', async () => {
    renderAt(ROUTES.settings);
    expect(await screen.findByRole('heading', { name: 'Настройки' })).toBeInTheDocument();
  });

  it('первый запуск — приветствие догружается', async () => {
    useUserProfileStore.setState({ onboarding: undefined });
    renderAt(ROUTES.dashboard);
    expect(await screen.findByText('Добро пожаловать в MILO')).toBeInTheDocument();
  });

  it('переход с главной на «Приложение» — страница догружается', async () => {
    const router = renderAt(ROUTES.dashboard);
    await act(() => router.navigate(ROUTES.app));
    expect(await screen.findByRole('heading', { name: 'Приложение' })).toBeInTheDocument();
  });

  it('техподдержка открывается по прямому адресу', async () => {
    renderAt(ROUTES.support);
    expect(await screen.findByRole('heading', { name: 'Техподдержка' })).toBeInTheDocument();
  });
});
