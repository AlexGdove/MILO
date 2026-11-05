import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { useProductStore, type ProductDraft } from '@/entities/product';
import { useShoppingStore } from '@/entities/shopping-item';

import { LowStockPrompt } from './LowStockPrompt';

const milk: ProductDraft = {
  name: 'Молоко',
  per100g: { kcal: 52, protein: 2.8, fat: 2.5, carbs: 4.7 },
  unit: 'ml',
  stock: 1000,
  minStock: 500,
};

const products = () => useProductStore.getState();
const items = () => useShoppingStore.getState().items;

beforeEach(() => {
  useProductStore.setState({ products: [] });
  useShoppingStore.setState(useShoppingStore.getInitialState(), true);
});

describe('LowStockPrompt', () => {
  it('предлагает добавить в покупки, когда остаток стал ниже минимума', async () => {
    const user = userEvent.setup();
    const { id } = products().addProduct(milk);
    render(<LowStockPrompt />);
    expect(screen.queryByRole('status')).toBeNull();

    act(() => products().adjustStock(id, -700));
    expect(screen.getByRole('status')).toHaveTextContent('Заканчивается: Молоко');
    // ничего не добавлено само
    expect(items()).toEqual([]);

    await user.click(screen.getByRole('button', { name: 'В покупки' }));
    // недостающее до минимума: 500 − 300 = 200 мл
    expect(items()).toMatchObject([{ productId: id, amount: 200, unit: 'ml' }]);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('без минимума — когда продукт закончился; «✕» закрывает без добавления', async () => {
    const user = userEvent.setup();
    const { id } = products().addProduct({ ...milk, minStock: 0 });
    render(<LowStockPrompt />);

    act(() => products().adjustStock(id, -500));
    expect(screen.queryByRole('status')).toBeNull();
    act(() => products().adjustStock(id, -500));
    expect(screen.getByRole('status')).toHaveTextContent('Закончилось: Молоко');

    await user.click(screen.getByRole('button', { name: 'Закрыть' }));
    expect(screen.queryByRole('status')).toBeNull();
    expect(items()).toEqual([]);
  });

  it('не предлагает, если продукт уже в списке покупок', () => {
    const product = products().addProduct(milk);
    useShoppingStore
      .getState()
      .addItem({ productId: product.id, name: 'Молоко', amount: 1000, unit: 'ml' });
    render(<LowStockPrompt />);

    act(() => products().adjustStock(product.id, -700));
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('пополнение до появления предложения его убирает', () => {
    const { id } = products().addProduct(milk);
    render(<LowStockPrompt />);
    act(() => products().adjustStock(id, -700));
    expect(screen.getByRole('status')).toBeInTheDocument();
    act(() => products().adjustStock(id, 1000));
    expect(screen.queryByRole('status')).toBeNull();
  });
});
