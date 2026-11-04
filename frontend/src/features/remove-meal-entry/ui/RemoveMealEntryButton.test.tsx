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
    stock: 300,
  });
  const entry = useMealEntryStore.getState().addEntry({
    date: '2026-11-04',
    mealType: 'lunch',
    productId: product.id,
    productName: product.name,
    per100g: product.per100g,
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
});
