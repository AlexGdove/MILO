import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { selectProductById, useProductStore, type ProductDraft } from '@/entities/product';
import { useShoppingStore } from '@/entities/shopping-item';

import { ProductList } from './ProductList';

const per100g = { kcal: 100, protein: 1, fat: 1, carbs: 1 };
const draft = (name: string, stock: number): ProductDraft => ({
  name,
  per100g,
  unit: 'g',
  stock,
  minStock: 0,
});

const products = () => useProductStore.getState();
const names = () =>
  screen.queryAllByRole('listitem').map((li) => within(li).getByRole('heading').textContent);

beforeEach(() => {
  useProductStore.setState({ products: [] });
  useShoppingStore.setState(useShoppingStore.getInitialState(), true);
});

describe('ProductList (кладовая)', () => {
  it('без поиска показывает только продукты в наличии, по алфавиту', () => {
    products().addProduct(draft('Рис', 900));
    products().addProduct(draft('Гречка', 0));
    products().addProduct(draft('Бананы', 300));
    render(<ProductList />);

    expect(names()).toEqual(['Бананы', 'Рис']);
    expect(screen.getByText('В наличии: 2')).toBeInTheDocument();
    // вкладок «Все / В наличии» больше нет
    expect(screen.queryByRole('tab')).toBeNull();
  });

  it('пустая кладовая подсказывает про поиск', () => {
    products().addProduct(draft('Гречка', 0));
    render(<ProductList />);
    expect(screen.getByText('Кладовая пуста')).toBeInTheDocument();
  });

  it('поиск находит и закончившиеся продукты: сначала то, что есть дома', async () => {
    const user = userEvent.setup();
    products().addProduct(draft('Гречка зелёная', 0));
    products().addProduct(draft('Гречка ядрица', 400));
    products().addProduct(draft('Рис', 900));
    render(<ProductList />);

    await user.type(screen.getByRole('searchbox', { name: 'Поиск продукта' }), 'греч');

    expect(names()).toEqual(['Гречка ядрица', 'Гречка зелёная']);
    expect(screen.getByText('Найдено: 2')).toBeInTheDocument();
  });

  it('из результатов поиска продукт можно положить в кладовую', async () => {
    const user = userEvent.setup();
    const buckwheat = products().addProduct(draft('Гречка', 0));
    render(<ProductList />);

    await user.type(screen.getByRole('searchbox', { name: 'Поиск продукта' }), 'греч');
    await user.click(screen.getByRole('button', { name: 'Гречка: в кладовую' }));
    const amount = screen.getByLabelText('Сколько добавить, г');
    await user.clear(amount);
    await user.type(amount, '900');
    await user.click(screen.getByRole('button', { name: 'В кладовую' }));

    expect(selectProductById(buckwheat.id)(products())?.stock).toBe(900);
    // после очистки поиска продукт виден в кладовой
    await user.clear(screen.getByRole('searchbox', { name: 'Поиск продукта' }));
    expect(names()).toEqual(['Гречка']);
  });

  it('из результатов поиска продукт можно добавить в покупки', async () => {
    const user = userEvent.setup();
    const buckwheat = products().addProduct(draft('Гречка', 0));
    render(<ProductList />);

    await user.type(screen.getByRole('searchbox', { name: 'Поиск продукта' }), 'греч');
    await user.click(screen.getByRole('button', { name: 'Гречка: в покупки' }));
    await user.click(screen.getByRole('button', { name: 'В список покупок' }));

    expect(useShoppingStore.getState().items).toMatchObject([
      { productId: buckwheat.id, amount: 500, unit: 'g' },
    ]);
  });

  it('если ничего не найдено — создать продукт с названием из поиска', async () => {
    const user = userEvent.setup();
    render(<ProductList />);

    await user.type(screen.getByRole('searchbox', { name: 'Поиск продукта' }), 'Киноа');
    expect(screen.getByText('Ничего не найдено')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Создать продукт' }));

    expect(screen.getByLabelText('Название')).toHaveValue('Киноа');
  });
});
