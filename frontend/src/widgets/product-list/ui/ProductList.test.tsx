import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render as rtlRender, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';

import { selectProductById, useProductStore, type ProductDraft } from '@/entities/product';
import { useShoppingStore } from '@/entities/shopping-item';

import { ProductList } from './ProductList';

// Кладовая показывает и найденное в Open Food Facts (TanStack Query) — нужен QueryClient.
// В тестах сервер не подключён, поэтому блок Open Food Facts скрыт и проверки не меняются.
const render = (ui: ReactElement) =>
  rtlRender(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

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

  // Регрессия (2026-11-06): после «В кладовую» поиск оставался — теперь сбрасывается сам
  it('из результатов поиска продукт можно положить в кладовую — поиск сбрасывается', async () => {
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
    // поиск сброшен сам — видна кладовая с добавленным продуктом
    expect(screen.getByRole('searchbox', { name: 'Поиск продукта' })).toHaveValue('');
    expect(screen.getByText('В наличии: 1')).toBeInTheDocument();
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

  it('создали продукт из поиска — поиск сбрасывается', async () => {
    const user = userEvent.setup();
    render(<ProductList />);

    await user.type(screen.getByRole('searchbox', { name: 'Поиск продукта' }), 'Киноа');
    await user.click(screen.getByRole('button', { name: 'Создать продукт' }));
    await user.type(screen.getByLabelText('Ккал / 100 г'), '368');
    await user.type(screen.getByLabelText('Белки, г'), '14');
    await user.type(screen.getByLabelText('Жиры, г'), '6');
    await user.type(screen.getByLabelText('Углеводы, г'), '64');
    await user.clear(screen.getByLabelText('В наличии, г'));
    await user.type(screen.getByLabelText('В наличии, г'), '500');
    await user.click(screen.getByRole('button', { name: 'Добавить' }));

    expect(products().products.map((p) => p.name)).toEqual(['Киноа']);
    expect(screen.getByRole('searchbox', { name: 'Поиск продукта' })).toHaveValue('');
    expect(names()).toEqual(['Киноа']);
  });

  it('в покупки из поиска — поиск остаётся (можно добавить ещё)', async () => {
    const user = userEvent.setup();
    products().addProduct(draft('Гречка', 0));
    render(<ProductList />);

    await user.type(screen.getByRole('searchbox', { name: 'Поиск продукта' }), 'греч');
    await user.click(screen.getByRole('button', { name: 'Гречка: в покупки' }));
    await user.click(screen.getByRole('button', { name: 'В список покупок' }));
    expect(screen.getByRole('searchbox', { name: 'Поиск продукта' })).toHaveValue('греч');
  });
  it('штрихкод из поиска попадает в поле штрихкода, название пустое', async () => {
    const user = userEvent.setup();
    render(<ProductList />);

    await user.type(screen.getByLabelText('Поиск продукта'), '4607001234567');
    expect(
      screen.getByText('Продукта со штрихкодом 4607001234567 ещё нет — создайте его'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Создать продукт' }));
    expect(screen.getByLabelText('Название')).toHaveValue('');
    expect(screen.getByLabelText('Штрихкод (необязательно)')).toHaveValue('4607001234567');
  });

  it('обычный текст из поиска по-прежнему попадает в название', async () => {
    const user = userEvent.setup();
    render(<ProductList />);

    await user.type(screen.getByLabelText('Поиск продукта'), 'Кефир');
    expect(screen.getByText('Продукта «Кефир» ещё нет — создайте его')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Создать продукт' }));
    expect(screen.getByLabelText('Название')).toHaveValue('Кефир');
    expect(screen.getByLabelText('Штрихкод (необязательно)')).toHaveValue('');
  });
});
