import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useDeviceKeyStore } from '@/entities/device-key';
import { useProductStore, type Product } from '@/entities/product';
import { type ProductSubmission, useSubmissionStore } from '@/entities/product-submission';
import { useShoppingStore } from '@/entities/shopping-item';

import { ProductList } from './ProductList';

const KEY = `mk_${'a'.repeat(43)}`;
const KEFIR: Product = {
  id: 'p1',
  name: 'Кефир',
  unit: 'ml',
  per100g: { kcal: 50, protein: 3, fat: 2.5, carbs: 4 },
  stock: 500,
  minStock: 0,
  createdAt: 0,
};
const submission = (status: ProductSubmission['status'], flags: string[] = []) => ({
  id: 's1',
  status,
  flags,
  reviewedBy: status === 'pending' ? null : 'auto',
  productId: null,
  name: 'Кефир',
  brand: 'Простоквашино',
  barcode: '4600000000017',
  createdAt: '2026-11-07T00:00:00.000Z',
});
const shared = (id: string, name: string, unit: 'g' | 'ml' = 'ml') => ({
  id,
  name,
  brand: 'Савушкин',
  barcode: null,
  unit,
  pieceWeight: null,
  per100g: { kcal: 56, protein: 3, fat: 3.2, carbs: 4 },
});

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

interface Call {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
}
const calls: Call[] = [];
/** Ответы сервера по адресу; по умолчанию — пусто */
let routes: Record<string, () => Response> = {};
const fetchMock = vi.fn<typeof fetch>((input, init) => {
  const url = String(input);
  const method = init?.method ?? 'GET';
  calls.push({
    url,
    method,
    headers: (init?.headers ?? {}) as Record<string, string>,
    body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
  });
  const route = Object.keys(routes).find((prefix) => `${method} ${url}`.startsWith(prefix));
  return Promise.resolve(route ? routes[route]!() : json(200, { items: [], nextCursor: null }));
});

const renderList = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <ProductList />
    </QueryClientProvider>,
  );

const openEdit = async () => {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Изменить Кефир' }));
  return { user, dialog: screen.getByRole('dialog', { name: 'Изменить продукт' }) };
};

// Глобалы и env сбрасываются после каждого теста (unstubGlobals / unstubEnvs в vitest.config)
beforeEach(() => {
  localStorage.clear();
  calls.length = 0;
  routes = {};
  useProductStore.setState({ products: [KEFIR] });
  useShoppingStore.setState(useShoppingStore.getInitialState(), true);
  useSubmissionStore.setState({ byProduct: {} });
  useDeviceKeyStore.setState({ key: null });
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('VITE_API_URL', '/api/v1');
});

describe('«Предложить в общую базу» (7c)', () => {
  it('отправляет описание продукта без остатков; статус — «На проверке»', async () => {
    routes = {
      'POST /api/v1/device-keys': () => json(201, { key: KEY }),
      'POST /api/v1/product-submissions': () => json(201, submission('pending')),
    };
    renderList();
    const { user, dialog } = await openEdit();
    await user.click(within(dialog).getByRole('button', { name: 'Предложить в общую базу' }));
    await user.type(within(dialog).getByLabelText('Бренд (необязательно)'), ' Простоквашино ');
    await user.type(within(dialog).getByLabelText('Штрихкод (необязательно)'), '4600 0000 00017');
    await user.click(within(dialog).getByRole('button', { name: 'Отправить' }));

    expect(await within(dialog).findByText('🕓 На проверке у модератора')).toBeInTheDocument();
    const post = calls.find((call) => call.url.endsWith('/product-submissions'));
    expect(post?.body).toEqual({
      name: 'Кефир',
      brand: 'Простоквашино',
      barcode: '4600000000017',
      unit: 'ml',
      pieceWeight: null,
      per100g: KEFIR.per100g,
    });
    expect(post?.headers['X-Device-Key']).toBe(KEY);
    expect(post?.headers['Idempotency-Key']).toMatch(/^[0-9a-f-]{36}$/);
    expect(useSubmissionStore.getState().byProduct.p1?.status).toBe('pending');
  });

  it('неверный штрихкод — понятная ошибка, статус не сохраняется', async () => {
    useDeviceKeyStore.setState({ key: KEY });
    routes = {
      'POST /api/v1/product-submissions': () =>
        json(400, {
          error: {
            code: 'validation_failed',
            message: 'Validation failed',
            details: [{ field: 'barcode', message: 'checksum' }],
          },
        }),
    };
    renderList();
    const { user, dialog } = await openEdit();
    await user.click(within(dialog).getByRole('button', { name: 'Предложить в общую базу' }));
    await user.type(within(dialog).getByLabelText('Штрихкод (необязательно)'), '123');
    await user.click(within(dialog).getByRole('button', { name: 'Отправить' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Штрихкод не подходит: 8, 12, 13 или 14 цифр, как на упаковке.',
    );
    expect(useSubmissionStore.getState().byProduct).toEqual({});
  });

  it('автомодерация отклонила — причина и «Предложить снова»', async () => {
    routes = {
      'POST /api/v1/device-keys': () => json(201, { key: KEY }),
      'POST /api/v1/product-submissions': () => json(201, submission('rejected', ['gibberish'])),
    };
    renderList();
    const { user, dialog } = await openEdit();
    await user.click(within(dialog).getByRole('button', { name: 'Предложить в общую базу' }));
    await user.click(within(dialog).getByRole('button', { name: 'Отправить' }));

    expect(
      await within(dialog).findByText('Не принято в общую базу: название не похоже на продукт'),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Предложить снова' })).toBeInTheDocument();
  });

  it('решение модератора приходит с сервера: «На проверке» → «В общей базе»', async () => {
    useDeviceKeyStore.setState({ key: KEY });
    useSubmissionStore.getState().record('p1', submission('pending') as ProductSubmission);
    routes = {
      'GET /api/v1/me/product-submissions': () =>
        json(200, { items: [submission('approved')], nextCursor: null }),
    };
    renderList();
    const { dialog } = await openEdit();

    expect(await within(dialog).findByText('✓ В общей базе MILO — спасибо!')).toBeInTheDocument();
    const list = calls.find((call) => call.url.includes('/me/product-submissions'));
    expect(list?.headers['X-Device-Key']).toBe(KEY);
  });

  it('нет предложений на проверке — статусы с сервера не запрашиваются', async () => {
    useDeviceKeyStore.setState({ key: KEY });
    renderList();
    await openEdit();
    expect(calls).toEqual([]);
  });

  it('без сервера блока «Общая база MILO» нет', async () => {
    vi.stubEnv('VITE_API_URL', '');
    renderList();
    const { dialog } = await openEdit();
    expect(within(dialog).queryByRole('region', { name: 'Общая база MILO' })).toBeNull();
  });
});

describe('поиск в кладовой: свои и общая база в одном списке (7c)', () => {
  const search = async (text: string) => {
    const user = userEvent.setup();
    await user.type(screen.getByRole('searchbox', { name: 'Поиск продукта' }), text);
    return user;
  };

  it('после своих — продукты общей базы, которых у пользователя нет', async () => {
    routes = {
      'GET /api/v1/products?': () =>
        json(200, {
          items: [shared('x1', 'Кефир'), shared('x2', 'Кефир 3,2%'), shared('x3', 'Кефир', 'g')],
          nextCursor: null,
        }),
    };
    renderList();
    await search('кефир');

    expect(await screen.findByText('Кефир 3,2%')).toBeInTheDocument();
    // «Кефир» в мл уже есть у пользователя — второй раз не показывается; в граммах — другой продукт
    const items = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(items.map((item) => within(item).getByRole('heading').textContent)).toEqual([
      'Кефир',
      'Кефир 3,2%',
      'Кефир',
    ]);
    expect(within(items[1]!).getByText('Савушкин · общая база MILO')).toBeInTheDocument();
    expect(screen.getByText('Найдено: 3')).toBeInTheDocument();
  });

  it('из общей базы — сразу в покупки или в кладовую, без формы; продукт свой', async () => {
    routes = {
      'GET /api/v1/products?': () =>
        json(200, { items: [shared('x2', 'Ряженка')], nextCursor: null }),
    };
    renderList();
    const user = await search('ряженка');
    const item = (await screen.findByText('Ряженка')).closest('li')!;
    expect(within(item).queryByRole('button', { name: 'Добавить' })).toBeNull();
    await user.click(within(item).getByRole('button', { name: 'Ряженка: в покупки' }));
    const dialog = screen.getByRole('dialog', { name: 'Ряженка' });
    await user.click(within(dialog).getByRole('button', { name: 'В список покупок' }));

    const added = useProductStore.getState().products.find((product) => product.name === 'Ряженка');
    expect(added).toEqual(expect.objectContaining({ unit: 'ml', stock: 0 }));
    expect(useShoppingStore.getState().items).toEqual([
      expect.objectContaining({ productId: added!.id, name: 'Ряженка' }),
    ]);
    expect(screen.getByRole('searchbox', { name: 'Поиск продукта' })).toHaveValue('');
  });

  it('своего нет, но есть в общей базе — без «Ничего не найдено»', async () => {
    routes = {
      'GET /api/v1/products?': () =>
        json(200, { items: [shared('x2', 'Ряженка')], nextCursor: null }),
    };
    renderList();
    await search('ряженка');
    expect(await screen.findByText('Ряженка')).toBeInTheDocument();
    expect(screen.queryByText('Ничего не найдено')).toBeNull();
    expect(screen.getByText('Найдено: 1')).toBeInTheDocument();
  });
});
