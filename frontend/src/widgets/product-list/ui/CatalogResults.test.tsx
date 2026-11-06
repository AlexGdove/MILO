import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useProductStore } from '@/entities/product';
import { useShoppingStore } from '@/entities/shopping-item';

import { ProductList } from './ProductList';

const fetchMock = vi.fn<typeof fetch>();
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
const BUCKWHEAT = {
  code: '4813494063866',
  name: 'Гречка ядрица',
  brand: 'Ярмарка',
  unit: 'g',
  per100g: { kcal: 340, protein: 13, fat: 3.1, carbs: 66 },
};

const renderList = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ProductList />
    </QueryClientProvider>,
  );
const search = async (text: string) => {
  const user = userEvent.setup();
  await user.type(screen.getByRole('searchbox', { name: 'Поиск продукта' }), text);
  return user;
};
const catalog = () => screen.queryByRole('region', { name: 'Найдено в Open Food Facts' });

// Глобалы и env сбрасываются после каждого теста (unstubGlobals / unstubEnvs в vitest.config)
beforeEach(() => {
  useProductStore.setState({ products: [] });
  useShoppingStore.setState(useShoppingStore.getInitialState(), true);
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(json(200, { items: [BUCKWHEAT] }));
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('VITE_API_URL', '/api/v1');
});

describe('Кладовая: найдено в Open Food Facts', () => {
  it('показывает найденное с брендом, КБЖУ и источником; один запрос после паузы ввода', async () => {
    renderList();
    await search('гречка');
    const item = await screen.findByText('Гречка ядрица');
    expect(screen.getByText('340 ккал на 100 г · Ярмарка')).toBeInTheDocument();
    expect(within(catalog()!).getByRole('link', { name: 'Open Food Facts' })).toBeInTheDocument();
    expect(item).toBeInTheDocument();
    // Буквы набирались по одной, но запрос ушёл один — после паузы
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('«Добавить» открывает заполненную форму; после сохранения — свой продукт, поиск сброшен', async () => {
    renderList();
    const user = await search('гречка');
    await screen.findByText('Гречка ядрица');
    await user.click(within(catalog()!).getByRole('button', { name: 'Добавить' }));

    const dialog = screen.getByRole('dialog', { name: 'Новый продукт' });
    expect(within(dialog).getByLabelText('Название')).toHaveValue('Гречка ядрица');
    expect(within(dialog).getByLabelText('Ккал / 100 г')).toHaveValue('340');
    expect(within(dialog).getByLabelText('Жиры, г')).toHaveValue('3.1');
    await user.click(within(dialog).getByRole('button', { name: 'Добавить' }));

    expect(useProductStore.getState().products).toEqual([
      expect.objectContaining({
        name: 'Гречка ядрица',
        unit: 'g',
        per100g: BUCKWHEAT.per100g,
        stock: 0,
      }),
    ]);
    expect(screen.getByRole('searchbox', { name: 'Поиск продукта' })).toHaveValue('');
    expect(catalog()).not.toBeInTheDocument();
  });

  it('лимит Open Food Facts — короткое пояснение', async () => {
    fetchMock.mockResolvedValue(json(503, { error: { code: 'catalog_busy', message: 'busy' } }));
    renderList();
    await search('гречка');
    expect(
      await screen.findByText('Слишком много запросов — попробуйте через минуту'),
    ).toBeInTheDocument();
  });

  it('Open Food Facts или сервер недоступен — блок молча скрыт', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    renderList();
    await search('гречка');
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await vi.waitFor(() => expect(catalog()).not.toBeInTheDocument());
  });

  it('без сервера в браузере по названию не ищет', async () => {
    vi.stubEnv('VITE_API_URL', '');
    renderList();
    await search('гречка');
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(catalog()).not.toBeInTheDocument();
  });
});
