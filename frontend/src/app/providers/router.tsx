import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { appRoutes } from './routes';

const router = createBrowserRouter(appRoutes);

export const AppRouter = () => <RouterProvider router={router} />;
