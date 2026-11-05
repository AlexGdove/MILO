import { Outlet } from 'react-router-dom';

import { AppHeader } from '@/widgets/app-header';
import { BottomNav } from '@/widgets/bottom-nav';
import { LowStockPrompt } from '@/widgets/low-stock-prompt';

export const RootLayout = () => (
  <>
    <AppHeader />
    <Outlet />
    <LowStockPrompt />
    <BottomNav />
  </>
);
