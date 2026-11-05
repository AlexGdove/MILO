import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { createId, persistStorage, roundAmount, storageKey } from '@/shared/lib';

import { migrateShopping, SHOPPING_STORAGE_VERSION } from './migrations';
import type { ShoppingItem, ShoppingItemDraft } from './types';

interface ShoppingState {
  items: ShoppingItem[];
  /**
   * Добавить продукт в покупки. Если он уже в списке — количество суммируется
   * (при другой единице заменяется), позиция снова становится некупленной.
   */
  addItem: (draft: ShoppingItemDraft) => ShoppingItem;
  toggleItem: (id: string) => void;
  removeItem: (id: string) => void;
  removeItems: (ids: readonly string[]) => void;
}

export const useShoppingStore = create<ShoppingState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (draft) => {
        const amount = Math.max(0, roundAmount(draft.amount, draft.unit));
        const existing = get().items.find((item) => item.productId === draft.productId);

        if (existing) {
          const merged: ShoppingItem = {
            ...existing,
            name: draft.name,
            unit: draft.unit,
            amount:
              existing.unit === draft.unit
                ? roundAmount(existing.amount + amount, draft.unit)
                : amount,
            checked: false,
          };
          set((state) => ({
            items: state.items.map((item) => (item.id === existing.id ? merged : item)),
          }));
          return merged;
        }

        const item: ShoppingItem = {
          ...draft,
          amount,
          id: createId(),
          checked: false,
          createdAt: Date.now(),
        };
        set((state) => ({ items: [...state.items, item] }));
        return item;
      },

      toggleItem: (id) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, checked: !item.checked } : item,
          ),
        })),

      removeItem: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),

      removeItems: (ids) => {
        const remove = new Set(ids);
        set((state) => ({ items: state.items.filter((item) => !remove.has(item.id)) }));
      },
    }),
    {
      name: storageKey('shopping'),
      storage: persistStorage,
      version: SHOPPING_STORAGE_VERSION,
      migrate: migrateShopping,
      partialize: (state) => ({ items: state.items }),
    },
  ),
);

export const selectShoppingItems = (state: ShoppingState) => state.items;

export const selectShoppingItemByProductId = (productId: string) => (state: ShoppingState) =>
  state.items.find((item) => item.productId === productId);
