import { QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { createQueryClient } from './queryClient';

/** Серверное состояние (TanStack Query) — пока только поддержка; личные данные — в zustand. */
export const QueryProvider = ({ children }: { children: ReactNode }) => {
  const [client] = useState(createQueryClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};
