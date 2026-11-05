import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';

import { DashboardPage } from '@/pages/dashboard';
import { PantryPage } from '@/pages/pantry';
import { ProfilePage } from '@/pages/profile';
import { RecipePage } from '@/pages/recipe';
import { RecipesPage } from '@/pages/recipes';
import { ShoppingPage } from '@/pages/shopping';
import { LEGACY_ROUTES, ROUTES } from '@/shared/config';

import { RootLayout } from '../layouts/RootLayout';

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: ROUTES.dashboard, element: <DashboardPage /> },
      { path: ROUTES.recipes, element: <RecipesPage /> },
      { path: ROUTES.recipe, element: <RecipePage /> },
      { path: ROUTES.pantry, element: <PantryPage /> },
      { path: ROUTES.shopping, element: <ShoppingPage /> },
      { path: ROUTES.profile, element: <ProfilePage /> },
      { path: LEGACY_ROUTES.products, element: <Navigate to={ROUTES.pantry} replace /> },
      { path: LEGACY_ROUTES.diary, element: <Navigate to={ROUTES.dashboard} replace /> },
      { path: '*', element: <Navigate to={ROUTES.dashboard} replace /> },
    ],
  },
]);

export const AppRouter = () => <RouterProvider router={router} />;
