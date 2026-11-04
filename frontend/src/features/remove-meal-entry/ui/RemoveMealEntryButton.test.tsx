import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { useMealEntryStore } from '@/entities/meal-entry';
import { selectProductById, useProductStore } from '@/entities/product';

import { RemoveMealEntryButton } from './RemoveMealEntryButton';

beforeEach(() => {
  useProductStore.setState(useProductStore.getInitialState(), true);
  useMealEntryStore.setState(useMealEntryStore.getInitialState(), true);
});

const setup = (stockDeducted: number) => {
  const product = useProductStore.getState().addProduct({
    name: 'Сырники',
    per100g: { kcal: 220, protein: 15.5, fat: 9, carbs: 20 },
    unit: 'g',
    stock: 300,
    minStock: 0,
  });
  const entry = useMealEntryStore.getState().addEntry({
    date: '2026-11-04',
    mealType: 'lunch',
    source: { type: 'product', id: product.id },
    productName: product.name,
    per100g: product.per100g,
    amount: 200,
    unit: 'g',
    grams: 200,
    stockDeducted,
  });
  render(<RemoveMealEntryButton entry={entry} />);
  return { product };
};

describe('RemoveMealEntryButton', () => {
  it('удаляет запись и возвращает списанное на остаток', async () => {
    const user = userEvent.setup();
    const { product } = setup(200);

    await user.click(screen.getByRole('button', { name: 'Удалить Сырники' }));

    expect(useMealEntryStore.getState().entries).toEqual([]);
    expect(selectProductById(product.id)(useProductStore.getState())?.stock).toBe(500);
  });

  it('не меняет остаток, если при добавлении ничего не списывалось', async () => {
    const user = userEvent.setup();
    const { product } = setup(0);

    await user.click(screen.getByRole('button', { name: 'Удалить Сырники' }));

    expect(useMealEntryStore.getState().entries).toEqual([]);
    expect(selectProductById(product.id)(useProductStore.getState())?.stock).toBe(300);
  });

  it('запись блюда по рецепту удаляется без изменения остатков продуктов', async () => {
    const user = userEvent.setup();
    const product = useProductStore.getState().addProduct({
      name: 'Сырники',
      per100g: { kcal: 220, protein: 15.5, fat: 9, carbs: 20 },
      unit: 'g',
      stock: 300,
      minStock: 0,
    });
    const entry = useMealEntryStore.getState().addEntry({
      date: '2026-11-04',
      mealType: 'dinner',
      // id рецепта совпадает с id продукта — остаток всё равно не должен меняться
      source: { type: 'recipe', id: product.id },
      productName: 'Сырники по рецепту',
      per100g: product.per100g,
      amount: 1,
      unit: 'pcs',
      grams: 200,
      stockDeducted: 150,
    });
    render(<RemoveMealEntryButton entry={entry} />);

    await user.click(screen.getByRole('button', { name: 'Удалить Сырники по рецепту' }));

    expect(useMealEntryStore.getState().entries).toEqual([]);
    expect(selectProductById(product.id)(useProductStore.getState())?.stock).toBe(300);
  });
});
