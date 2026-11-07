import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, Navigate, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// jsdom не реализует matchMedia, а модуль установки приложения проверяет режим standalone при импорте.
// Заглушка «не установлено» ставится до импорта страниц.
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

import { useProductStore } from '@/entities/product';
import { useShoppingStore } from '@/entities/shopping-item';
import { AppPage } from '@/pages/app';
import { PantryPage } from '@/pages/pantry';
import { ProfilePage } from '@/pages/profile';
import { LEGACY_ROUTES, ROUTES, SHOPPING_PATH } from '@/shared/config';

import { RootLayout } from '../layouts/RootLayout';

const renderAt = (path: string) => {
  // Через общий макет: шапка (логотип, счётчик, кнопка «Приложение») — в RootLayout (решение №29)
  const router = createMemoryRouter(
    [
      {
        element: <RootLayout />,
        children: [
          { path: ROUTES.pantry, element: <PantryPage /> },
          { path: ROUTES.profile, element: <ProfilePage /> },
          { path: ROUTES.app, element: <AppPage /> },
          { path: LEGACY_ROUTES.shopping, element: <Navigate to={SHOPPING_PATH} replace /> },
        ],
      },
    ],
    { initialEntries: [path] },
  );
  // Как в App.tsx: кладовая читает статусы предложений через TanStack Query
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { router, user: userEvent.setup() };
};

beforeEach(() => {
  useProductStore.setState({ products: [] });
  useShoppingStore.setState(useShoppingStore.getInitialState(), true);
});

describe('кладовая: вкладки «Кладовая» и «Покупки» (решение №28)', () => {
  it('по умолчанию — кладовая с кнопкой «+ Продукт»', () => {
    renderAt('/pantry');
    expect(screen.getByRole('tab', { name: 'Кладовая' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('heading', { level: 1, name: 'Кладовая' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ Продукт' })).toBeInTheDocument();
  });

  it('вкладка «Покупки» показывает список покупок и сохраняется в адресе', async () => {
    const { user, router } = renderAt('/pantry');
    await user.click(screen.getByRole('tab', { name: 'Покупки' }));

    expect(router.state.location.search).toBe('?tab=shopping');
    expect(screen.getByRole('heading', { level: 1, name: 'Покупки' })).toBeInTheDocument();
    expect(screen.getByText('Список покупок пуст')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '+ Продукт' })).toBeNull();
  });

  it('старый адрес /shopping открывает вкладку покупок', () => {
    const { router } = renderAt('/shopping');
    expect(router.state.location.pathname).toBe('/pantry');
    expect(router.state.location.search).toBe('?tab=shopping');
    expect(screen.getByRole('tab', { name: 'Покупки' })).toHaveAttribute('aria-selected', 'true');
  });
});

describe('страница «Приложение»', () => {
  it('кнопка в шапке ведёт на страницу приложения', async () => {
    const { user, router } = renderAt('/profile');
    await user.click(screen.getByRole('link', { name: 'Приложение' }));
    expect(router.state.location.pathname).toBe('/app');
  });

  it('показывает установку PWA, инструкции и «скоро» для магазинов', () => {
    renderAt('/app');
    expect(screen.getByRole('heading', { level: 1, name: 'Приложение' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Установить MILO' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'iPhone и iPad' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Android' })).toBeInTheDocument();
    expect(screen.getByText('App Store · скоро')).toBeInTheDocument();
    expect(screen.getByText('Google Play · скоро')).toBeInTheDocument();
  });

  // Требование изменилось (решение №30): в профиле — данные и норма вместо формы «Дневная цель»
  it('в профиле больше нет карточки установки — данные и норма', () => {
    renderAt('/profile');
    expect(screen.getByRole('heading', { name: 'Мои данные' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Дневная норма' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Установить MILO' })).toBeNull();
  });
});
