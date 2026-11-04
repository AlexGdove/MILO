import { beforeEach, describe, expect, it } from 'vitest';

import { SEED_PRODUCTS } from './seed';
import { selectProductById, selectProducts, useProductStore } from './store';
import type { ProductDraft } from './types';
import { filterProducts } from '../lib/filterProducts';

const draft: ProductDraft = {
  name: 'Сырники',
  per100g: { kcal: 220, protein: 15.5, fat: 9, carbs: 20 },
  stock: 500,
};

const state = () => useProductStore.getState();

beforeEach(() => {
  useProductStore.setState(useProductStore.getInitialState(), true);
});

describe('useProductStore', () => {
  it('при первом запуске содержит стартовый набор продуктов', () => {
    expect(selectProducts(state()).map((p) => p.name)).toEqual(SEED_PRODUCTS.map((p) => p.name));
    expect(new Set(state().products.map((p) => p.id)).size).toBe(SEED_PRODUCTS.length);
  });

  it('addProduct добавляет продукт в начало и возвращает его с id', () => {
    const created = state().addProduct(draft);

    expect(created).toMatchObject(draft);
    expect(created.id).toEqual(expect.any(String));
    expect(state().products[0]).toEqual(created);
    expect(state().products).toHaveLength(SEED_PRODUCTS.length + 1);
  });

  it('updateProduct меняет только указанный продукт', () => {
    const created = state().addProduct(draft);
    const other = state().products[1];

    state().updateProduct(created.id, { ...draft, name: 'Сырники домашние', stock: 300 });

    expect(selectProductById(created.id)(state())).toMatchObject({
      id: created.id,
      name: 'Сырники домашние',
      stock: 300,
      createdAt: created.createdAt,
    });
    expect(state().products[1]).toEqual(other);
  });

  it('removeProduct удаляет продукт', () => {
    const created = state().addProduct(draft);
    state().removeProduct(created.id);
    expect(selectProductById(created.id)(state())).toBeUndefined();
  });

  describe('adjustStock', () => {
    it('списывает и пополняет остаток', () => {
      const { id } = state().addProduct(draft);
      state().adjustStock(id, -200);
      expect(selectProductById(id)(state())?.stock).toBe(300);
      state().adjustStock(id, 50);
      expect(selectProductById(id)(state())?.stock).toBe(350);
    });

    it('не уводит остаток ниже нуля', () => {
      const { id } = state().addProduct(draft);
      state().adjustStock(id, -800);
      expect(selectProductById(id)(state())?.stock).toBe(0);
    });

    it('округляет остаток до целых граммов', () => {
      const { id } = state().addProduct({ ...draft, stock: 100 });
      state().adjustStock(id, -0.4);
      expect(selectProductById(id)(state())?.stock).toBe(100);
    });

    it('не трогает другие продукты и игнорирует неизвестный id', () => {
      const before = state().products;
      state().adjustStock('unknown-id', -10);
      expect(state().products).toEqual(before);
    });
  });

  it('selectProductById(null) возвращает undefined', () => {
    expect(selectProductById(null)(state())).toBeUndefined();
  });
});

describe('filterProducts', () => {
  const products = useProductStore.getInitialState().products;

  it('без запроса возвращает все продукты', () => {
    expect(filterProducts(products, '   ')).toBe(products);
  });

  it('ищет без учёта регистра и пробелов по краям', () => {
    expect(filterProducts(products, '  КУРИН ').map((p) => p.name)).toEqual([
      'Куриная грудка',
      'Яйцо куриное',
    ]);
  });

  it('находит по части слова', () => {
    expect(filterProducts(products, 'хлоп').map((p) => p.name)).toEqual(['Овсяные хлопья']);
  });

  it('возвращает пустой список, если ничего не найдено', () => {
    expect(filterProducts(products, 'ананас')).toEqual([]);
  });
});
