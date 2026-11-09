import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage, storageKey } from '@/shared/lib';

/** Ключ хранилища настройки «Отчёты об ошибках» (решение №62). */
export const ERROR_REPORTS_STORAGE_KEY = storageKey('error-reports');

interface ErrorReportsState {
  /** По умолчанию включено; человек отключает в «Настройках» */
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

export const useErrorReportsStore = create<ErrorReportsState>()(
  persist(
    (set) => ({
      enabled: true,
      setEnabled: (enabled) => set({ enabled }),
    }),
    {
      name: ERROR_REPORTS_STORAGE_KEY,
      storage: persistStorage,
      version: 1,
      // Непонятное значение — значение по умолчанию (включено)
      migrate: (persisted) => ({
        enabled: (persisted as { enabled?: unknown } | null)?.enabled !== false,
      }),
      partialize: (state) => ({ enabled: state.enabled }),
    },
  ),
);

export const selectErrorReportsEnabled = (state: ErrorReportsState) => state.enabled;
