import { beforeEach, describe, expect, it } from 'vitest';

import { SEED_PRODUCTS } from './seed';
import { selectProductById, selectProducts, useProductStore } from './store';
import type { ProductDraft } from './types';
import { filterProducts } from '../lib/filterProducts';

const draft: ProductDraft = {
  name: 'Сырники',
  per100g: { kcal: 220, protein: 15.5, fat: 9, carbs: 20 },
  unit: 'g',
  stock: 500,
  minStock: 0,
};

const state = () => useProductStore.getState();

beforeEach(() => {
  useProductStore.setState(useProductStore.getInitialState(), true);
});

describe('useProductStore', () => {
  it('после переименования в MILO поднимает продукты пользователя из старого ключа и мигрирует v1 → v2', async () => {
    const saved = {
      id: 'legacy-1',
      name: 'Гречка домашняя',
      per100g: { kcal: 313, protein: 12.6, fat: 3.3, carbs: 62.1 },
      stock: 750,
      createdAt: 1,
    };
    // Пользователь после обновления: есть только старый ключ. Сброс стора в beforeEach
    // через setState уже записал стартовый набор в новый ключ — убираем его.
    localStorage.clear();
    localStorage.setItem(
      'calorie-tracker:products',
      JSON.stringify({ state: { products: [saved] }, version: 1 }), // версия persist стора продуктов
    );
    expect(localStorage.getItem('milo:products')).toBeNull();

    await useProductStore.persist.rehydrate();

    // v1 хранил остаток в граммах: миграция добавляет единицу «г» и нулевой минимальный остаток
    const migrated = { ...saved, unit: 'g', minStock: 0 };
    expect(state().products).toEqual([migrated]);
    expect(localStorage.getItem('calorie-tracker:products')).toBeNull();
    const stored = JSON.parse(localStorage.getItem('milo:products') ?? 'null');
    expect(stored?.state.products).toEqual([migrated]);
    expect(stored?.version).toBe(2);
  });

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

  it('вес штуки хранится только у штучных продуктов', () => {
    const eggs = state().addProduct({ ...draft, unit: 'pcs', pieceWeight: 55 });
    expect(eggs.pieceWeight).toBe(55);

    state().updateProduct(eggs.id, { ...draft, unit: 'g', pieceWeight: 55 });
    expect(selectProductById(eggs.id)(state())).not.toHaveProperty('pieceWeight');

    const flour = state().addProduct({ ...draft, unit: 'g', pieceWeight: 30 });
    expect(flour).not.toHaveProperty('pieceWeight');
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

    it('штучный остаток округляется до десятых', () => {
      const { id } = state().addProduct({ ...draft, unit: 'pcs', pieceWeight: 55, stock: 6 });
      state().adjustStock(id, -1.26);
      expect(selectProductById(id)(state())?.stock).toBe(4.7);
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
