import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { selectProducts, useProductStore, type ProductDraft } from '@/entities/product';

import { IngredientPicker } from './IngredientPicker';

const per100g = { kcal: 100, protein: 1, fat: 1, carbs: 1 };
const draft = (name: string, stock: number): ProductDraft => ({
  name,
  per100g,
  unit: 'g',
  stock,
  minStock: 0,
});

const SHARED = {
  id: 's1',
  name: 'Гречка ядрица',
  brand: 'Мистраль',
  barcode: '4600682000013',
  unit: 'g',
  pieceWeight: null,
  per100g: { kcal: 343, protein: 12.6, fat: 3.3, carbs: 62.1 },
  createdAt: '2026-11-06T00:00:00.000Z',
};
const OFF_SAME_BARCODE = {
  code: '4600682000013',
  name: 'Гречка (дубль из OFF)',
  brand: null,
  unit: 'g',
  per100g: SHARED.per100g,
};
const OFF_MILK = {
  code: '4607025391234',
  name: 'Молоко 2,5%',
  brand: 'Домик в деревне',
  unit: 'ml',
  per100g: { kcal: 53, protein: 2.8, fat: 2.5, carbs: 4.7 },
};

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
const fetchMock = vi.fn<typeof fetch>((input) => {
  const url = String(input);
  if (url.startsWith('/api/v1/products')) return Promise.resolve(json({ items: [SHARED] }));
  if (url.startsWith('/api/v1/food-catalog/search')) {
    return Promise.resolve(json({ items: [OFF_SAME_BARCODE, OFF_MILK] }));
  }
  return Promise.reject(new TypeError('unexpected request'));
});

/** Поле выбора с настоящим хранилищем продуктов — как в форме рецепта. */
const Harness = () => {
  const products = useProductStore(selectProducts);
  const [value, setValue] = useState('');
  return (
    <IngredientPicker label="Продукт 1" products={products} value={value} onChange={setValue} />
  );
};

const setup = () => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <Harness />
    </QueryClientProvider>,
  );
  return userEvent.setup();
};
const openPicker = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: /^Продукт 1:/ }));
  return screen.getByRole('dialog', { name: 'Выбор продукта' });
};
const products = () => useProductStore.getState().products;

// Глобалы и env сбрасываются после каждого теста (unstubGlobals / unstubEnvs в vitest.config)
beforeEach(() => {
  useProductStore.setState({ products: [] });
  fetchMock.mockClear();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('VITE_API_URL', '/api/v1');
});

describe('IngredientPicker (выбор ингредиента поиском)', () => {
  it('свои продукты: сначала то, что есть дома; выбор подставляет продукт в поле', async () => {
    useProductStore.getState().addProduct(draft('Авокадо', 0));
    useProductStore.getState().addProduct(draft('Яйца', 6));
    const user = setup();
    expect(screen.getByRole('button', { name: 'Продукт 1: не выбран' })).toBeInTheDocument();

    const dialog = await openPicker(user);
    const own = within(within(dialog).getByRole('region', { name: 'Ваши продукты' }));
    expect(own.getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Яйцаесть 6 г',
      'Авокадонет дома',
    ]);
    await user.click(own.getByRole('button', { name: /^Яйца/ }));

    expect(screen.getByRole('button', { name: 'Продукт 1: Яйца' })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('общая база и Open Food Facts; дубль по штрихкоду из OFF скрыт; выбор создаёт свой продукт с остатком 0', async () => {
    const user = setup();
    const dialog = await openPicker(user);
    await user.type(within(dialog).getByRole('searchbox', { name: 'Название продукта' }), 'греч');

    const shared = await within(dialog).findByRole('region', { name: 'Общая база MILO' });
    expect(within(shared).getByText('343 ккал на 100 г · Мистраль')).toBeInTheDocument();
    const off = await within(dialog).findByRole('region', { name: 'Open Food Facts' });
    expect(within(off).queryByText('Гречка (дубль из OFF)')).not.toBeInTheDocument();
    expect(within(off).getByText('Молоко 2,5%')).toBeInTheDocument();

    await user.click(within(shared).getByRole('button', { name: /^Гречка ядрица/ }));
    expect(products()).toEqual([
      expect.objectContaining({
        name: 'Гречка ядрица',
        unit: 'g',
        per100g: SHARED.per100g,
        stock: 0,
        minStock: 0,
      }),
    ]);
    expect(screen.getByRole('button', { name: 'Продукт 1: Гречка ядрица' })).toBeInTheDocument();
  });

  it('продукт с таким же названием и единицей уже есть — берётся он, второй не создаётся', async () => {
    const own = useProductStore.getState().addProduct({ ...draft('молоко 2,5%', 500), unit: 'ml' });
    const user = setup();
    const dialog = await openPicker(user);
    await user.type(within(dialog).getByRole('searchbox', { name: 'Название продукта' }), 'Молоко');

    const off = await within(dialog).findByRole('region', { name: 'Open Food Facts' });
    await user.click(within(off).getByRole('button', { name: /^Молоко 2,5%/ }));

    expect(products()).toEqual([own]);
    expect(screen.getByRole('button', { name: 'Продукт 1: молоко 2,5%' })).toBeInTheDocument();
  });

  it('без сервера в браузере ищутся только свои продукты', async () => {
    vi.stubEnv('VITE_API_URL', '');
    const user = setup();
    const dialog = await openPicker(user);
    await user.type(within(dialog).getByRole('searchbox', { name: 'Название продукта' }), 'греч');
    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(within(dialog).getByText('У вас такого нет — поищите в базе ниже')).toBeInTheDocument();
  });
});
