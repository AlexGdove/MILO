import { QueryClient } from '@tanstack/react-query';

import { ApiError } from '@/shared/api';

/** Ошибки запроса, которые повтором не исправить: неверный запрос, нет доступа, лимит. */
const isFinal = (error: unknown) =>
  error instanceof ApiError && error.status >= 400 && error.status < 500;

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failures, error) => !isFinal(error) && failures < 2,
        staleTime: 30_000,
        refetchOnWindowFocus: true,
      },
      // Отправку повторяет пользователь (с тем же Idempotency-Key), не автоматика
      mutations: { retry: false },
    },
  });
