import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';

import { DashboardPage } from '@/pages/dashboard';
import { ProductsPage } from '@/pages/products';
import { ROUTES } from '@/shared/config';

import { RootLayout } from '../layouts/RootLayout';

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: ROUTES.dashboard, element: <DashboardPage /> },
      { path: ROUTES.products, element: <ProductsPage /> },
      { path: '*', element: <Navigate to={ROUTES.dashboard} replace /> },
    ],
  },
]);

export const AppRouter = () => <RouterProvider router={router} />;
