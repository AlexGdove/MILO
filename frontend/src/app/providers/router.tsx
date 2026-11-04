import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { DashboardPage } from '@/pages/dashboard';
import { ROUTES } from '@/shared/config';

const router = createBrowserRouter([{ path: ROUTES.dashboard, element: <DashboardPage /> }]);

export const AppRouter = () => <RouterProvider router={router} />;
