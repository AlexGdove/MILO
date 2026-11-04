import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { createId, persistStorage, roundAmount, storageKey } from '@/shared/lib';

import { migrateProducts, PRODUCTS_STORAGE_VERSION } from './migrations';
import { SEED_PRODUCTS } from './seed';
import type { Product, ProductDraft } from './types';

interface ProductState {
  products: Product[];
  addProduct: (draft: ProductDraft) => Product;
  updateProduct: (id: string, draft: ProductDraft) => void;
  removeProduct: (id: string) => void;
  /** Изменить остаток на delta в единицах продукта (не уходит ниже нуля). */
  adjustStock: (id: string, delta: number) => void;
}

/** Вес штуки хранится только для штучных продуктов. */
const normalizeDraft = (draft: ProductDraft): ProductDraft => {
  const { pieceWeight, ...rest } = draft;
  return draft.unit === 'pcs' && pieceWeight ? { ...rest, pieceWeight } : rest;
};

const toProduct = (draft: ProductDraft): Product => ({
  ...normalizeDraft(draft),
  id: createId(),
  createdAt: Date.now(),
});

export const useProductStore = create<ProductState>()(
  persist(
    (set) => ({
      products: SEED_PRODUCTS.map(toProduct),

      addProduct: (draft) => {
        const product = toProduct(draft);
        set((state) => ({ products: [product, ...state.products] }));
        return product;
      },

      updateProduct: (id, draft) =>
        set((state) => ({
          products: state.products.map((product) => {
            if (product.id !== id) return product;
            // Вес штуки берётся только из нового черновика (при смене единицы старый не остаётся)
            const base: Product = { ...product };
            delete base.pieceWeight;
            return { ...base, ...normalizeDraft(draft) };
          }),
        })),

      removeProduct: (id) =>
        set((state) => ({ products: state.products.filter((product) => product.id !== id) })),

      adjustStock: (id, delta) =>
        set((state) => ({
          products: state.products.map((product) =>
            product.id === id
              ? {
                  ...product,
                  stock: Math.max(0, roundAmount(product.stock + delta, product.unit)),
                }
              : product,
          ),
        })),
    }),
    {
      name: storageKey('products'),
      storage: persistStorage,
      version: PRODUCTS_STORAGE_VERSION,
      migrate: migrateProducts,
      partialize: (state) => ({ products: state.products }),
    },
  ),
);

export const selectProducts = (state: ProductState) => state.products;

export const selectProductById = (id: string | null) => (state: ProductState) =>
  id ? state.products.find((product) => product.id === id) : undefined;
