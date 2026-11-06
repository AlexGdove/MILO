import { useApplyTheme } from '@/features/switch-theme';

import { AppRouter, ErrorBoundary, QueryProvider } from './providers';
import './styles/global.css';

export const App = () => {
  // Тема из профиля — на всех экранах, включая анкету первого запуска
  useApplyTheme();

  return (
    <ErrorBoundary>
      <QueryProvider>
        <AppRouter />
      </QueryProvider>
    </ErrorBoundary>
  );
};
