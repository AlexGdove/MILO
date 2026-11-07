import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError, apiRequest, isApiEnabled, socketOrigin } from './http';

const fetchMock = vi.fn<typeof fetch>();
const respond = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
const lastCall = () => {
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  return { url, init, headers: init.headers as Record<string, string> };
};

// Глобалы и env сбрасываются после каждого теста (unstubGlobals / unstubEnvs в vitest.config)
beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(respond(200, {}));
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('VITE_API_URL', '/api/v1');
});

describe('apiRequest', () => {
  it('GET с query: пустые параметры не попадают в адрес, без Content-Type', async () => {
    await apiRequest('/support/tickets', { query: { limit: 50, cursor: undefined } });
    const { url, init, headers } = lastCall();
    expect(url).toBe('/api/v1/support/tickets?limit=50');
    expect(init.method).toBe('GET');
    expect(headers).not.toHaveProperty('Content-Type');
    expect(headers).not.toHaveProperty('X-Device-Key');
  });

  it('POST с телом, ключом устройства и Idempotency-Key', async () => {
    await apiRequest('/support/tickets', {
      method: 'POST',
      body: { text: 'x' },
      deviceKey: 'mk_1',
      idempotencyKey: 'u1',
    });
    const { init, headers } = lastCall();
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{"text":"x"}');
    expect(headers).toMatchObject({
      'X-Device-Key': 'mk_1',
      'Idempotency-Key': 'u1',
      'Content-Type': 'application/json',
    });
  });

  it('2xx → разобранный JSON', async () => {
    fetchMock.mockResolvedValue(respond(200, { ok: true }));
    await expect(apiRequest('/x')).resolves.toEqual({ ok: true });
  });

  it('204 → undefined', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(apiRequest('/x')).resolves.toBeUndefined();
  });

  it('ошибка API → ApiError со статусом, кодом и деталями', async () => {
    fetchMock.mockResolvedValue(
      respond(429, {
        error: { code: 'rate_limited', message: 'Too many', details: [{ message: 'later' }] },
      }),
    );
    const error = (await apiRequest('/x').catch((e: unknown) => e)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(429);
    expect(error.code).toBe('rate_limited');
    expect(error.details).toEqual([{ message: 'later' }]);
  });

  it('нет сети → ApiError network_error, статус 0', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const error = (await apiRequest('/x').catch((e: unknown) => e)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe('network_error');
    expect(error.status).toBe(0);
  });

  it('без адреса сервера → api_disabled, запроса нет', async () => {
    vi.stubEnv('VITE_API_URL', '');
    expect(isApiEnabled()).toBe(false);
    const error = (await apiRequest('/x').catch((e: unknown) => e)) as ApiError;
    expect(error.code).toBe('api_disabled');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('socketOrigin', () => {
  it('абсолютный адрес API → его origin; относительный → текущий сайт', () => {
    vi.stubEnv('VITE_API_URL', 'https://api.milo.app/api/v1/');
    expect(socketOrigin()).toBe('https://api.milo.app');
    vi.stubEnv('VITE_API_URL', '/api/v1');
    expect(socketOrigin()).toBe(window.location.origin);
  });
});

describe('apiRequest: медленная сеть и старые браузеры', () => {
  /** fetch, который не отвечает, пока его не отменят */
  const hangingFetch = (_input: RequestInfo | URL, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () =>
        reject(new DOMException('aborted', 'AbortError')),
      );
    });

  it('сервер не ответил за тайм-аут — network_error, а не вечное ожидание', async () => {
    vi.useFakeTimers();
    try {
      fetchMock.mockImplementation(hangingFetch);
      const request = apiRequest('/products', { timeoutMs: 1000 });
      const assertion = expect(request).rejects.toMatchObject({
        code: 'network_error',
        message: 'Request timed out',
      });
      await vi.advanceTimersByTimeAsync(1000);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });

  it('отмена снаружи (TanStack Query) — AbortError, не ошибка сети', async () => {
    fetchMock.mockImplementation(hangingFetch);
    const controller = new AbortController();
    const request = apiRequest('/products', { signal: controller.signal });
    controller.abort();
    await expect(request).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('параметры запроса не теряются без URLSearchParams.size (Safari < 17)', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(URLSearchParams.prototype, 'size');
    Object.defineProperty(URLSearchParams.prototype, 'size', {
      configurable: true,
      get: () => undefined,
    });
    try {
      await apiRequest('/products', { query: { q: 'кефир', limit: 20 } });
      expect(lastCall().url).toBe('/api/v1/products?q=%D0%BA%D0%B5%D1%84%D0%B8%D1%80&limit=20');
    } finally {
      if (descriptor) Object.defineProperty(URLSearchParams.prototype, 'size', descriptor);
    }
  });
});
