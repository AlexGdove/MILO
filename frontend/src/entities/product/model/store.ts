import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { createId, persistStorage, storageKey } from '@/shared/lib';

import { SEED_PRODUCTS } from './seed';
import type { Product, ProductDraft } from './types';

interface ProductState {
  products: Product[];
  addProduct: (draft: ProductDraft) => Product;
  updateProduct: (id: string, draft: ProductDraft) => void;
  removeProduct: (id: string) => void;
  /** Изменить остаток на delta грамм (не уходит ниже нуля). */
  adjustStock: (id: string, delta: number) => void;
}

const toProduct = (draft: ProductDraft): Product => ({
  ...draft,
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
          products: state.products.map((product) =>
            product.id === id ? { ...product, ...draft } : product,
          ),
        })),

      removeProduct: (id) =>
        set((state) => ({ products: state.products.filter((product) => product.id !== id) })),

      adjustStock: (id, delta) =>
        set((state) => ({
          products: state.products.map((product) =>
            product.id === id
              ? { ...product, stock: Math.max(0, Math.round(product.stock + delta)) }
              : product,
          ),
        })),
    }),
    { name: storageKey('products'), storage: persistStorage, version: 1 },
  ),
);

export const selectProducts = (state: ProductState) => state.products;

export const selectProductById = (id: string | null) => (state: ProductState) =>
  id ? state.products.find((product) => product.id === id) : undefined;
