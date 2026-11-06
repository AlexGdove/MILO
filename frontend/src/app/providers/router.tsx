import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';

import { AppPage } from '@/pages/app';
import { DashboardPage } from '@/pages/dashboard';
import { PantryPage } from '@/pages/pantry';
import { ProfilePage } from '@/pages/profile';
import { RecipePage } from '@/pages/recipe';
import { RecipesPage } from '@/pages/recipes';
import { SettingsPage } from '@/pages/settings';
import { SupportPage, SupportTicketPage } from '@/pages/support';
import { WelcomePage } from '@/pages/welcome';
import { LEGACY_ROUTES, ROUTES, SHOPPING_PATH } from '@/shared/config';

import { OnboardingGate } from './OnboardingGate';
import { RootLayout } from '../layouts/RootLayout';

const routes = [
  // Анкета первого запуска — без шапки и нижней навигации
  { path: ROUTES.welcome, element: <WelcomePage /> },
  {
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
      { path: ROUTES.settings, element: <SettingsPage /> },
      { path: ROUTES.support, element: <SupportPage /> },
      { path: ROUTES.supportTicket, element: <SupportTicketPage /> },
      { path: ROUTES.app, element: <AppPage /> },
      { path: LEGACY_ROUTES.products, element: <Navigate to={ROUTES.pantry} replace /> },
      { path: LEGACY_ROUTES.diary, element: <Navigate to={ROUTES.dashboard} replace /> },
      { path: LEGACY_ROUTES.shopping, element: <Navigate to={SHOPPING_PATH} replace /> },
      { path: '*', element: <Navigate to={ROUTES.dashboard} replace /> },
    ],
  },
];

const router = createBrowserRouter(routes);

export const AppRouter = () => <RouterProvider router={router} />;
