import { Outlet } from 'react-router-dom';

import { BottomNav } from '@/widgets/bottom-nav';

export const RootLayout = () => (
  <>
    <Outlet />
    <BottomNav />
  </>
);
