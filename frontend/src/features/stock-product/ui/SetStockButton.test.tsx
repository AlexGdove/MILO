import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { selectProductById, useProductStore, type ProductDraft } from '@/entities/product';

import { SetStockButton } from './SetStockButton';

const milk: ProductDraft = {
  name: 'Молоко',
  per100g: { kcal: 52, protein: 2.8, fat: 2.5, carbs: 4.7 },
  unit: 'ml',
  stock: 200,
  minStock: 0,
};

const setup = (draft: ProductDraft = milk) => {
  const product = useProductStore.getState().addProduct(draft);
  render(<SetStockButton product={product} />);
  return {
    user: userEvent.setup(),
    stock: () => selectProductById(product.id)(useProductStore.getState())?.stock,
  };
};

beforeEach(() => {
  useProductStore.setState({ products: [] });
});

describe('SetStockButton', () => {
  it('показывает остаток и по нажатию открывает правку', async () => {
    const { user } = setup();
    const trigger = screen.getByRole('button', { name: 'Молоко: изменить остаток' });
    expect(trigger).toHaveTextContent('В наличии: 200 мл');

    await user.click(trigger);
    expect(screen.getByLabelText('Остаток, мл')).toHaveValue('200');
  });

  it('задаёт точное значение', async () => {
    const { user, stock } = setup();
    await user.click(screen.getByRole('button', { name: 'Молоко: изменить остаток' }));
    const field = screen.getByLabelText('Остаток, мл');
    await user.clear(field);
    await user.type(field, '750');
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));
    expect(stock()).toBe(750);
  });

  it('− и + меняют на шаг единицы и не уходят ниже нуля', async () => {
    const { user, stock } = setup();
    await user.click(screen.getByRole('button', { name: 'Молоко: изменить остаток' }));
    await user.click(screen.getByRole('button', { name: 'Больше на 100 мл' }));
    expect(screen.getByLabelText('Остаток, мл')).toHaveValue('300');
    for (let i = 0; i < 5; i++) {
      await user.click(screen.getByRole('button', { name: 'Меньше на 100 мл' }));
    }
    expect(screen.getByLabelText('Остаток, мл')).toHaveValue('0');
    // до сохранения остаток не меняется
    expect(stock()).toBe(200);
  });

  it('штучный продукт: шаг 1 шт', async () => {
    const { user } = setup({ ...milk, name: 'Яйца', unit: 'pcs', pieceWeight: 55, stock: 3 });
    await user.click(screen.getByRole('button', { name: 'Яйца: изменить остаток' }));
    await user.click(screen.getByRole('button', { name: 'Больше на 1 шт' }));
    expect(screen.getByLabelText('Остаток, шт')).toHaveValue('4');
  });

  it('«Закончилось» обнуляет остаток', async () => {
    const { user, stock } = setup();
    await user.click(screen.getByRole('button', { name: 'Молоко: изменить остаток' }));
    await user.click(screen.getByRole('button', { name: 'Закончилось' }));
    expect(stock()).toBe(0);
  });

  it('отрицательное число не сохраняется', async () => {
    const { user, stock } = setup();
    await user.click(screen.getByRole('button', { name: 'Молоко: изменить остаток' }));
    const field = screen.getByLabelText('Остаток, мл');
    await user.clear(field);
    await user.type(field, '-5');
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));
    expect(screen.getByText('Число 0 или больше')).toBeInTheDocument();
    expect(stock()).toBe(200);
  });
});
