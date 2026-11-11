import { Navigate, type RouteObject } from 'react-router-dom';

import { DashboardPage } from '@/pages/dashboard';
import { PantryPage } from '@/pages/pantry';
import { ProfilePage } from '@/pages/profile';
import { RecipePage } from '@/pages/recipe';
import { RecipesPage } from '@/pages/recipes';
import { LEGACY_ROUTES, ROUTES, SHOPPING_PATH } from '@/shared/config';

import { OnboardingGate } from './OnboardingGate';
import { RootLayout } from '../layouts/RootLayout';

/**
 * Редкие страницы — отдельными файлами, по требованию (слабые телефоны и медленная сеть):
 * основной файл приложения меньше, первый экран быстрее. В PWA и в приложении эти файлы всё
 * равно лежат на устройстве (кэш service worker / APK), без сети тоже открываются.
 */
const lazyPage = {
  welcome: async () => ({ Component: (await import('@/pages/welcome')).WelcomePage }),
  settings: async () => ({ Component: (await import('@/pages/settings')).SettingsPage }),
  support: async () => ({ Component: (await import('@/pages/support')).SupportPage }),
  supportTicket: async () => ({ Component: (await import('@/pages/support')).SupportTicketPage }),
  account: async () => ({ Component: (await import('@/pages/account')).AccountPage }),
  app: async () => ({ Component: (await import('@/pages/app')).AppPage }),
};

/** Пока при первом открытии догружается страница — пустой фон (из кэша это доли секунды). */
const Loading = () => null;

/** Маршруты приложения; отдельно от роутера — их проверяют тесты (`createMemoryRouter`). */
export const appRoutes: RouteObject[] = [
  // Анкета первого запуска — без шапки и нижней навигации
  { path: ROUTES.welcome, lazy: lazyPage.welcome, HydrateFallback: Loading },
  {
    HydrateFallback: Loading,
    element: (
      <OnboardingGate>
        <RootLayout />
      </OnboardingGate>
    ),
    children: [
      { path: ROUTES.dashboard, element: <DashboardPage /> },
      { path: ROUTES.recipes, element: <RecipesPage /> },
      { path: ROUTES.recipe, element: <RecipePage /> },
      { path: ROUTES.pantry, element: <PantryPage /> },
      { path: ROUTES.profile, element: <ProfilePage /> },
      { path: ROUTES.settings, lazy: lazyPage.settings },
      { path: ROUTES.support, lazy: lazyPage.support },
      { path: ROUTES.supportTicket, lazy: lazyPage.supportTicket },
      { path: ROUTES.account, lazy: lazyPage.account },
      { path: ROUTES.app, lazy: lazyPage.app },
      { path: LEGACY_ROUTES.products, element: <Navigate to={ROUTES.pantry} replace /> },
      { path: LEGACY_ROUTES.diary, element: <Navigate to={ROUTES.dashboard} replace /> },
      { path: LEGACY_ROUTES.shopping, element: <Navigate to={SHOPPING_PATH} replace /> },
      { path: '*', element: <Navigate to={ROUTES.dashboard} replace /> },
    ],
  },
];
