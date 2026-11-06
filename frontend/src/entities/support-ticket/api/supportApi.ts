import { apiRequest } from '@/shared/api';

import type { SupportMessage, SupportTicket, TicketPage } from '../model/types';

/** Запросы поддержки (`/support/tickets`). Ключ устройства передаёт вызывающий слой. */
export const supportApi = {
  list: (key: string, cursor?: string) =>
    apiRequest<TicketPage>('/support/tickets', { deviceKey: key, query: { cursor, limit: 50 } }),

  get: (key: string, id: string) =>
    apiRequest<SupportTicket>(`/support/tickets/${encodeURIComponent(id)}`, { deviceKey: key }),

  messages: (key: string, id: string, after?: string) =>
    apiRequest<{ items: SupportMessage[] }>(`/support/tickets/${encodeURIComponent(id)}/messages`, {
      deviceKey: key,
      query: { after, limit: 100 },
    }),

  create: (key: string, text: string, idempotencyKey: string) =>
    apiRequest<SupportTicket & { messages: SupportMessage[] }>('/support/tickets', {
      method: 'POST',
      deviceKey: key,
      idempotencyKey,
      body: { text },
    }),

  send: (key: string, id: string, text: string, idempotencyKey: string) =>
    apiRequest<SupportMessage>(`/support/tickets/${encodeURIComponent(id)}/messages`, {
      method: 'POST',
      deviceKey: key,
      idempotencyKey,
      body: { text },
    }),

  close: (key: string, id: string) =>
    apiRequest<SupportTicket>(`/support/tickets/${encodeURIComponent(id)}/close`, {
      method: 'POST',
      deviceKey: key,
    }),
};

/** Ключи кэша TanStack Query для поддержки. */
export const supportKeys = {
  all: ['support'] as const,
  tickets: () => [...supportKeys.all, 'tickets'] as const,
  ticket: (id: string) => [...supportKeys.all, 'ticket', id] as const,
  messages: (id: string) => [...supportKeys.all, 'messages', id] as const,
};
