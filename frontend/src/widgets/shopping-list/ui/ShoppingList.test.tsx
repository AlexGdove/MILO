import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { selectProductById, useProductStore, type ProductDraft } from '@/entities/product';
import { useShoppingStore } from '@/entities/shopping-item';

import { ShoppingList } from './ShoppingList';

const per100g = { kcal: 100, protein: 1, fat: 1, carbs: 1 };
const eggsDraft: ProductDraft = {
  name: 'Яйца тестовые',
  per100g,
  unit: 'pcs',
  pieceWeight: 55,
  stock: 2,
  minStock: 6,
};

const products = () => useProductStore.getState();
const shopping = () => useShoppingStore.getState();

beforeEach(() => {
  // только тестовые продукты: стартовый набор не отслеживается (minStock 0) и подсказок не даёт
  useProductStore.setState({ products: [] });
  useShoppingStore.setState(useShoppingStore.getInitialState(), true);
});

describe('ShoppingList', () => {
  it('без позиций и подсказок показывает пустое состояние', () => {
    render(<ShoppingList />);
    expect(screen.getByText('Список покупок пуст')).toBeInTheDocument();
  });

  it('полный цикл: подсказка → в покупки → отметить купленное → перенести в кладовую', async () => {
    const user = userEvent.setup();
    const eggs = products().addProduct(eggsDraft);
    render(<ShoppingList />);

    // Подсказка, но ничего не добавлено автоматически
    const suggestions = screen.getByRole('region', { name: 'Заканчиваются в кладовой' });
    // selector: в строке есть и закрытый <dialog> с тем же названием в заголовке
    expect(within(suggestions).getByText('Яйца тестовые', { selector: 'span' })).toBeVisible();
    expect(within(suggestions).getByText('2 шт из минимума 6 шт')).toBeInTheDocument();
    expect(shopping().items).toEqual([]);

    // Количество по умолчанию — недостающее до минимума (6 − 2 = 4)
    await user.click(within(suggestions).getByRole('button', { name: 'В покупки' }));
    const amount = screen.getByLabelText('Сколько купить, шт');
    expect(amount).toHaveValue('4');
    await user.click(screen.getByRole('button', { name: 'В список покупок' }));

    expect(shopping().items).toMatchObject([{ productId: eggs.id, amount: 4, unit: 'pcs' }]);
    expect(screen.queryByRole('region', { name: 'Заканчиваются в кладовой' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Отметьте купленное' })).toBeDisabled();

    await user.click(screen.getByRole('checkbox', { name: /Яйца тестовые/ }));
    await user.click(screen.getByRole('button', { name: 'Перенести купленное в кладовую (1)' }));

    expect(selectProductById(eggs.id)(products())?.stock).toBe(6);
    expect(shopping().items).toEqual([]);
  });

  it('позицию удалённого продукта не переносит и помечает', async () => {
    const user = userEvent.setup();
    const rice = products().addProduct({ ...eggsDraft, name: 'Рис', unit: 'g', minStock: 0 });
    shopping().addItem({ productId: rice.id, name: 'Рис', amount: 900, unit: 'g' });
    products().removeProduct(rice.id);
    render(<ShoppingList />);

    expect(screen.getByText('Продукт удалён из кладовой — перенести нельзя')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: /Рис/ }));
    expect(screen.getByRole('button', { name: 'Отметьте купленное' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Убрать Рис из списка' }));
    expect(shopping().items).toEqual([]);
  });

  it('не принимает нулевое количество', async () => {
    const user = userEvent.setup();
    products().addProduct(eggsDraft);
    render(<ShoppingList />);

    await user.click(screen.getByRole('button', { name: 'В покупки' }));
    const amount = screen.getByLabelText('Сколько купить, шт');
    await user.clear(amount);
    await user.type(amount, '0');
    await user.click(screen.getByRole('button', { name: 'В список покупок' }));

    expect(screen.getByText('Укажите количество больше нуля')).toBeInTheDocument();
    expect(shopping().items).toEqual([]);
  });
});
