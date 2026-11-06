import { Outlet } from 'react-router-dom';

import { AppHeader } from '@/widgets/app-header';
import { BottomNav } from '@/widgets/bottom-nav';
import { LowStockPrompt } from '@/widgets/low-stock-prompt';

import { useNativeBackButton } from './useNativeBackButton';
import { useSwipeNavigation } from './useSwipeNavigation';

export const RootLayout = () => {
  // Свайп влево-вправо переключает разделы нижней навигации
  useSwipeNavigation();
  // Аппаратная «Назад» в мобильном приложении (Capacitor); в браузере ничего не делает
  useNativeBackButton();
  return (
    <>
      <AppHeader />
      <Outlet />
      <LowStockPrompt />
      <BottomNav />
    </>
  );
};
