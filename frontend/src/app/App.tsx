import { useApplyTheme } from '@/features/switch-theme';

import { AppRouter, ErrorBoundary } from './providers';
import './styles/global.css';

export const App = () => {
  // Тема из профиля — на всех экранах, включая анкету первого запуска
  useApplyTheme();

  return (
    <ErrorBoundary>
      <AppRouter />
    </ErrorBoundary>
  );
};
