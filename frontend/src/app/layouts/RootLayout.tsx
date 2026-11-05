import { Outlet } from 'react-router-dom';

import { AppHeader } from '@/widgets/app-header';
import { BottomNav } from '@/widgets/bottom-nav';

export const RootLayout = () => (
  <>
    <AppHeader />
    <Outlet />
    <BottomNav />
  </>
);
