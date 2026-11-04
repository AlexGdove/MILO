import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';

import { DashboardPage } from '@/pages/dashboard';
import { DiaryPage } from '@/pages/diary';
import { ProductsPage } from '@/pages/products';
import { ProfilePage } from '@/pages/profile';
import { ROUTES } from '@/shared/config';

import { RootLayout } from '../layouts/RootLayout';

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: ROUTES.dashboard, element: <DashboardPage /> },
      { path: ROUTES.diary, element: <DiaryPage /> },
      { path: ROUTES.products, element: <ProductsPage /> },
      { path: ROUTES.profile, element: <ProfilePage /> },
      { path: '*', element: <Navigate to={ROUTES.dashboard} replace /> },
    ],
  },
]);

export const AppRouter = () => <RouterProvider router={router} />;
