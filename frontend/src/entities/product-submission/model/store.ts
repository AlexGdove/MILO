import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage, storageKey } from '@/shared/lib';

import type { ProductSubmission, SubmissionRecord } from './types';

interface SubmissionState {
  /** Свой продукт (id в кладовой) → его последнее предложение в общую базу */
  byProduct: Record<string, SubmissionRecord>;
  record: (productId: string, submission: ProductSubmission) => void;
  /** Обновить статусы по ответу сервера (решение оператора) */
  applyServer: (items: ProductSubmission[]) => void;
  forget: (productId: string) => void;
}

const STATUSES = new Set(['pending', 'approved', 'rejected']);

const isRecord = (value: unknown): value is SubmissionRecord => {
  const record = value as Partial<SubmissionRecord> | null;
  return (
    typeof record?.id === 'string' &&
    STATUSES.has(record.status ?? '') &&
    Array.isArray(record.flags) &&
    typeof record.submittedAt === 'number'
  );
};

/**
 * Предложения своих продуктов в общую базу (B-18): статус хранится на устройстве, чтобы он
 * был виден и без сети; решение оператора подтягивается с сервера (`applyServer`).
 */
export const useSubmissionStore = create<SubmissionState>()(
  persist(
    (set) => ({
      byProduct: {},
      record: (productId, submission) =>
        set((state) => ({
          byProduct: {
            ...state.byProduct,
            [productId]: {
              id: submission.id,
              status: submission.status,
              flags: submission.flags,
              submittedAt: Date.now(),
            },
          },
        })),
      applyServer: (items) =>
        set((state) => {
          const byId = new Map(items.map((item) => [item.id, item]));
          let changed = false;
          const next: Record<string, SubmissionRecord> = {};
          for (const [productId, record] of Object.entries(state.byProduct)) {
            const server = byId.get(record.id);
            if (server && server.status !== record.status) {
              next[productId] = { ...record, status: server.status, flags: server.flags };
              changed = true;
            } else {
              next[productId] = record;
            }
          }
          return changed ? { byProduct: next } : state;
        }),
      forget: (productId) =>
        set((state) => {
          if (!(productId in state.byProduct)) return state;
          const next = { ...state.byProduct };
          delete next[productId];
          return { byProduct: next };
        }),
    }),
    {
      name: storageKey('product-submissions'),
      storage: persistStorage,
      version: 1,
      partialize: (state) => ({ byProduct: state.byProduct }),
      // Повреждённые записи отбрасываются — продукт можно предложить заново
      merge: (persisted, current) => {
        const raw = (persisted as { byProduct?: Record<string, unknown> } | null)?.byProduct ?? {};
        const byProduct = Object.fromEntries(
          Object.entries(raw).filter((entry): entry is [string, SubmissionRecord] =>
            isRecord(entry[1]),
          ),
        );
        return { ...current, byProduct };
      },
    },
  ),
);

export const selectSubmission = (productId: string) => (state: SubmissionState) =>
  state.byProduct[productId];

export const selectHasPending = (state: SubmissionState) =>
  Object.values(state.byProduct).some((record) => record.status === 'pending');
