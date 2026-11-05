import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { selectProductById, useProductStore } from '@/entities/product';

import { AddToPantryButton } from './AddToPantryButton';

const setup = () => {
  const product = useProductStore.getState().addProduct({
    name: 'Яйца',
    per100g: { kcal: 157, protein: 12.7, fat: 11.5, carbs: 0.7 },
    unit: 'pcs',
    pieceWeight: 55,
    stock: 2,
    minStock: 6,
  });
  render(<AddToPantryButton product={product} />);
  return {
    user: userEvent.setup(),
    stock: () => selectProductById(product.id)(useProductStore.getState())?.stock,
  };
};

beforeEach(() => {
  useProductStore.setState({ products: [] });
});

describe('AddToPantryButton', () => {
  it('по умолчанию предлагает недостающее до минимума и прибавляет его к остатку', async () => {
    const { user, stock } = setup();
    await user.click(screen.getByRole('button', { name: 'Яйца: в кладовую' }));
    const field = screen.getByLabelText('Сколько добавить, шт');
    expect(field).toHaveValue('4');
    await user.click(screen.getByRole('button', { name: 'В кладовую' }));
    expect(stock()).toBe(6);
  });

  it('принимает дробное количество через запятую', async () => {
    const { user, stock } = setup();
    await user.click(screen.getByRole('button', { name: 'Яйца: в кладовую' }));
    const field = screen.getByLabelText('Сколько добавить, шт');
    await user.clear(field);
    await user.type(field, '1,5');
    await user.click(screen.getByRole('button', { name: 'В кладовую' }));
    expect(stock()).toBe(3.5);
  });

  it('не меняет остаток при нулевом количестве', async () => {
    const { user, stock } = setup();
    await user.click(screen.getByRole('button', { name: 'Яйца: в кладовую' }));
    const field = screen.getByLabelText('Сколько добавить, шт');
    await user.clear(field);
    await user.type(field, '0');
    await user.click(screen.getByRole('button', { name: 'В кладовую' }));
    expect(screen.getByText('Укажите количество больше нуля')).toBeInTheDocument();
    expect(stock()).toBe(2);
  });
});
