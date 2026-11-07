import { apiRequest } from '@/shared/api';

import type { ProductSubmission, SubmissionRequest } from '../model/types';

export const submissionKeys = {
  all: ['product-submissions'] as const,
  mine: (deviceKey: string | null) => ['product-submissions', 'mine', deviceKey] as const,
};

/** Сколько своих предложений читать для обновления статусов (новые сверху). */
const LIST_LIMIT = 50;

export const submissionsApi = {
  /** Предложить продукт: решение автомодерации приходит сразу в ответе. */
  submit: (deviceKey: string, body: SubmissionRequest, idempotencyKey: string) =>
    apiRequest<ProductSubmission>('/product-submissions', {
      method: 'POST',
      body,
      deviceKey,
      idempotencyKey,
    }),

  /** Свои предложения — чтобы узнать решение оператора по `pending`. */
  listMine: async (deviceKey: string, signal?: AbortSignal) =>
    (
      await apiRequest<{ items: ProductSubmission[] }>('/me/product-submissions', {
        query: { limit: LIST_LIMIT },
        deviceKey,
        signal,
      })
    ).items,
};
