import { beforeEach, describe, expect, it } from 'vitest';

import { migrateShopping } from './migrations';
import { selectShoppingItemByProductId, selectShoppingItems, useShoppingStore } from './store';
import type { ShoppingItemDraft } from './types';

const milk: ShoppingItemDraft = { productId: 'p-milk', name: 'Молоко', amount: 1000, unit: 'ml' };
const eggs: ShoppingItemDraft = { productId: 'p-eggs', name: 'Яйца', amount: 10, unit: 'pcs' };

const state = () => useShoppingStore.getState();

beforeEach(() => {
  localStorage.clear();
  useShoppingStore.setState(useShoppingStore.getInitialState(), true);
});

describe('useShoppingStore', () => {
  it('при первом запуске список пуст', () => {
    expect(selectShoppingItems(state())).toEqual([]);
  });

  it('addItem добавляет некупленную позицию в конец списка', () => {
    state().addItem(milk);
    const created = state().addItem(eggs);

    expect(created).toMatchObject({ ...eggs, checked: false });
    expect(created.id).toEqual(expect.any(String));
    expect(state().items.map((item) => item.productId)).toEqual(['p-milk', 'p-eggs']);
  });

  it('повторное добавление продукта суммирует количество и снимает отметку «куплено»', () => {
    const first = state().addItem(milk);
    state().toggleItem(first.id);

    const merged = state().addItem({ ...milk, amount: 500, name: 'Молоко 2,5%' });

    expect(state().items).toHaveLength(1);
    expect(merged).toMatchObject({
      id: first.id,
      amount: 1500,
      checked: false,
      name: 'Молоко 2,5%',
    });
  });

  it('если единица продукта изменилась — количество заменяется, а не суммируется', () => {
    state().addItem({ ...eggs, amount: 600, unit: 'g' });
    state().addItem(eggs);
    expect(selectShoppingItemByProductId('p-eggs')(state())).toMatchObject({
      amount: 10,
      unit: 'pcs',
    });
  });

  it('количество округляется по единице (шт — до десятых)', () => {
    expect(state().addItem({ ...eggs, amount: 1.26 }).amount).toBe(1.3);
    expect(state().addItem({ ...milk, amount: 250.4 }).amount).toBe(250);
  });

  it('toggleItem переключает отметку только у указанной позиции', () => {
    const a = state().addItem(milk);
    state().addItem(eggs);
    state().toggleItem(a.id);
    expect(state().items.map((item) => item.checked)).toEqual([true, false]);
    state().toggleItem(a.id);
    expect(state().items.map((item) => item.checked)).toEqual([false, false]);
  });

  it('removeItem и removeItems удаляют позиции', () => {
    const a = state().addItem(milk);
    const b = state().addItem(eggs);
    state().removeItem(a.id);
    expect(state().items.map((item) => item.id)).toEqual([b.id]);
    state().removeItems([b.id, 'unknown']);
    expect(state().items).toEqual([]);
  });

  it('сохраняет список в milo:shopping и восстанавливает после перезагрузки', async () => {
    const item = state().addItem(milk);
    const stored = JSON.parse(localStorage.getItem('milo:shopping') ?? 'null');
    expect(stored).toMatchObject({ version: 1, state: { items: [item] } });

    useShoppingStore.setState({ items: [] });
    localStorage.setItem('milo:shopping', JSON.stringify(stored));
    await useShoppingStore.persist.rehydrate();
    expect(state().items).toEqual([item]);
  });
});

describe('migrateShopping', () => {
  it('отбрасывает некорректные записи и приводит поля к ожидаемым типам', () => {
    const result = migrateShopping({
      items: [
        {
          id: 'a',
          productId: 'p1',
          name: 'Рис',
          amount: 900,
          unit: 'g',
          checked: true,
          createdAt: 5,
        },
        { id: 'b', productId: 'p2', amount: -3, unit: 'кг', checked: 'yes' },
        { id: 'c' },
        null,
      ],
    });

    expect(result.items).toEqual([
      {
        id: 'a',
        productId: 'p1',
        name: 'Рис',
        amount: 900,
        unit: 'g',
        checked: true,
        createdAt: 5,
      },
      expect.objectContaining({
        id: 'b',
        productId: 'p2',
        name: '',
        amount: 0,
        unit: 'g',
        checked: false,
      }),
    ]);
  });

  it('на мусорном состоянии возвращает пустой список', () => {
    expect(migrateShopping(null)).toEqual({ items: [] });
    expect(migrateShopping({ items: 'x' })).toEqual({ items: [] });
  });
});
