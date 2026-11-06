import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useDeviceKeyStore } from '@/entities/device-key';
import { SettingsPage } from '@/pages/settings';
import { SupportPage, SupportTicketPage } from '@/pages/support';
import { ROUTES } from '@/shared/config';

import { QueryProvider } from './QueryProvider';
import { RootLayout } from '../layouts/RootLayout';

// --- WebSocket: подменённый socket.io-client — тест сам «присылает» события сервера ---
type Handler = (payload: unknown) => void;
const socket = vi.hoisted(() => {
  const handlers = new Map<string, Handler[]>();
  return {
    handlers,
    options: [] as unknown[],
    serverEmit(event: string, payload: unknown) {
      for (const handler of handlers.get(event) ?? []) handler(payload);
    },
  };
});
vi.mock('socket.io-client', () => ({
  io: (_url: string, options: unknown) => {
    socket.options.push(options);
    return {
      on: (event: string, handler: Handler) => {
        socket.handlers.set(event, [...(socket.handlers.get(event) ?? []), handler]);
      },
      close: () => socket.handlers.clear(),
    };
  },
}));

// --- Сервер: подменённый fetch по контракту docs/backend/api.md ---
const KEY = `mk_${'k'.repeat(43)}`;
interface Msg {
  id: string;
  author: 'user' | 'operator';
  operatorName: string | null;
  text: string;
  createdAt: string;
}
interface Ticket {
  id: string;
  number: number;
  status: 'open' | 'answered' | 'closed';
  createdAt: string;
  updatedAt: string;
  messages: Msg[];
}
const server = {
  failCreate: false,
  tickets: [] as Ticket[],
  seq: 0,
  requests: [] as { method: string; path: string; headers: Record<string, string> }[],
};
const at = () => new Date(Date.UTC(2026, 10, 6, 10, 0, server.seq++)).toISOString();
const json = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
const view = ({ messages, ...ticket }: Ticket) => ({
  ...ticket,
  lastMessage: messages.at(-1) ?? null,
});
const userMessage = (text: string): Msg => ({
  id: `m${server.seq}`,
  author: 'user',
  operatorName: null,
  text,
  createdAt: at(),
});

const fakeFetch = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
  const url = new URL(String(input), 'http://localhost');
  const method = init.method ?? 'GET';
  const headers = (init.headers ?? {}) as Record<string, string>;
  const path = url.pathname.replace('/api/v1', '');
  server.requests.push({ method, path, headers });
  const body = init.body ? (JSON.parse(String(init.body)) as { text: string }) : null;

  if (method === 'POST' && path === '/device-keys') return json(201, { key: KEY });
  if (headers['X-Device-Key'] !== KEY) return json(401, { error: { code: 'device_key_invalid' } });

  if (path === '/support/tickets') {
    if (method === 'POST') {
      if (server.failCreate) {
        return json(429, { error: { code: 'rate_limited', message: 'Too many' } });
      }
      const now = at();
      const ticket: Ticket = {
        id: `t${server.tickets.length + 1}`,
        number: server.tickets.length + 1,
        status: 'open',
        createdAt: now,
        updatedAt: now,
        messages: [userMessage(body?.text ?? '')],
      };
      server.tickets.push(ticket);
      return json(201, { ...view(ticket), messages: ticket.messages });
    }
    return json(200, { items: [...server.tickets].reverse().map(view), nextCursor: null });
  }
  const match = /^\/support\/tickets\/([^/]+)(\/messages|\/close)?$/.exec(path);
  const ticket = server.tickets.find((t) => t.id === match?.[1]);
  if (!ticket) return json(404, { error: { code: 'ticket_not_found' } });
  if (!match?.[2]) return json(200, view(ticket));
  if (match[2] === '/close') {
    ticket.status = 'closed';
    return json(200, view(ticket));
  }
  if (method === 'POST') {
    const message = userMessage(body?.text ?? '');
    ticket.messages.push(message);
    ticket.status = 'open';
    return json(201, message);
  }
  return json(200, { items: ticket.messages });
});

const renderAt = (path: string) => {
  const router = createMemoryRouter(
    [
      {
        element: <RootLayout />,
        children: [
          { path: ROUTES.settings, element: <SettingsPage /> },
          { path: ROUTES.support, element: <SupportPage /> },
          { path: ROUTES.supportTicket, element: <SupportTicketPage /> },
        ],
      },
    ],
    { initialEntries: [path] },
  );
  render(
    <QueryProvider>
      <RouterProvider router={router} />
    </QueryProvider>,
  );
  return { router, user: userEvent.setup() };
};

beforeEach(() => {
  server.failCreate = false;
  server.tickets = [];
  server.seq = 0;
  server.requests = [];
  socket.handlers.clear();
  socket.options = [];
  localStorage.clear();
  useDeviceKeyStore.setState({ key: null });
  fakeFetch.mockClear();
  vi.stubGlobal('fetch', fakeFetch);
  vi.stubEnv('VITE_API_URL', '/api/v1');
});

describe('Техподдержка (решение №43, сервер — B-19)', () => {
  it('из настроек → новое обращение: ключ устройства появляется при отправке, открывается переписка', async () => {
    const { router, user } = renderAt(ROUTES.settings);
    await user.click(screen.getByRole('link', { name: 'Написать в поддержку' }));
    expect(router.state.location.pathname).toBe(ROUTES.support);

    // Без ключа список не запрашивается и ключ не создаётся
    expect(server.requests).toEqual([]);

    await user.type(screen.getByLabelText('Новое обращение'), '  Не сохраняется продукт  ');
    await user.click(screen.getByRole('button', { name: 'Отправить' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Обращение № 1' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/settings/support/t1');
    expect(useDeviceKeyStore.getState().key).toBe(KEY);
    const messages = screen.getByRole('list', { name: 'Сообщения' });
    expect(within(messages).getByText('Не сохраняется продукт')).toBeInTheDocument();
    expect(within(messages).getByText('Вы')).toBeInTheDocument();
    expect(screen.getByText('Ждёт ответа')).toBeInTheDocument();

    const create = server.requests.find(
      (r) => r.method === 'POST' && r.path === '/support/tickets',
    );
    expect(create?.headers['Idempotency-Key']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('ответ оператора приходит по WebSocket; ответ пользователя; «Вопрос решён»', async () => {
    useDeviceKeyStore.setState({ key: KEY });
    const now = at();
    server.tickets.push({
      id: 't1',
      number: 7,
      status: 'open',
      createdAt: now,
      updatedAt: now,
      messages: [userMessage('Помогите')],
    });
    const { user } = renderAt('/settings/support/t1');
    expect(await screen.findByText('Помогите')).toBeInTheDocument();
    expect(socket.options).toContainEqual(expect.objectContaining({ auth: { deviceKey: KEY } }));

    act(() => {
      socket.serverEmit('message.created', {
        ticketId: 't1',
        message: {
          id: 'op1',
          author: 'operator',
          operatorName: 'Анна',
          text: 'Сейчас поможем',
          createdAt: at(),
        },
      });
      socket.serverEmit('ticket.updated', { ticketId: 't1', status: 'answered', updatedAt: at() });
    });
    expect(await screen.findByText('Сейчас поможем')).toBeInTheDocument();
    expect(screen.getByText('Анна')).toBeInTheDocument();
    expect(screen.getByText('Есть ответ')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Сообщение'), 'Спасибо!');
    await user.click(screen.getByRole('button', { name: 'Отправить' }));
    expect(await screen.findByText('Спасибо!')).toBeInTheDocument();
    expect(screen.getByLabelText('Сообщение')).toHaveValue('');

    await user.click(screen.getByRole('button', { name: 'Вопрос решён' }));
    expect(await screen.findByText('Закрыто')).toBeInTheDocument();
    expect(screen.getByLabelText('Написать — обращение откроется снова')).toBeInTheDocument();
  });

  it('список обращений с последним сообщением', async () => {
    useDeviceKeyStore.setState({ key: KEY });
    const now = at();
    server.tickets.push({
      id: 't1',
      number: 3,
      status: 'answered',
      createdAt: now,
      updatedAt: now,
      messages: [
        { id: 'op', author: 'operator', operatorName: 'Анна', text: 'Готово', createdAt: now },
      ],
    });
    renderAt(ROUTES.support);
    const list = await screen.findByRole('region', { name: 'Мои обращения' });
    const link = within(list).getByRole('link', { name: /Обращение № 3/ });
    expect(link).toHaveAttribute('href', '/settings/support/t1');
    expect(within(link).getByText('Есть ответ')).toBeInTheDocument();
    expect(within(link).getByText('Поддержка: Готово')).toBeInTheDocument();
  });

  it('ошибка отправки — понятный текст, введённое сообщение не теряется', async () => {
    server.failCreate = true;
    const { user } = renderAt(ROUTES.support);
    await user.type(screen.getByLabelText('Новое обращение'), 'Вопрос');
    await user.click(screen.getByRole('button', { name: 'Отправить' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Слишком много сообщений подряд');
    expect(screen.getByLabelText('Новое обращение')).toHaveValue('Вопрос');
  });

  it('без адреса сервера — «Поддержка пока недоступна», запросов нет', () => {
    vi.stubEnv('VITE_API_URL', '');
    renderAt(ROUTES.support);
    expect(screen.getByText('Поддержка пока недоступна')).toBeInTheDocument();
    expect(fakeFetch).not.toHaveBeenCalled();
  });
});
