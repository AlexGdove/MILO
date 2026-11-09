import { useEffect } from 'react';

import { installErrorReporting } from '@/features/report-errors';
import { useApplyTheme } from '@/features/switch-theme';

import { AppRouter, ErrorBoundary, QueryProvider } from './providers';
import './styles/global.css';

export const App = () => {
  // Тема из профиля — на всех экранах, включая анкету первого запуска
  useApplyTheme();
  // Необработанные ошибки и промисы — в отчёты (если человек не отключил в настройках)
  useEffect(() => installErrorReporting(), []);

  return (
    <ErrorBoundary>
      <QueryProvider>
        <AppRouter />
      </QueryProvider>
    </ErrorBoundary>
  );
};
