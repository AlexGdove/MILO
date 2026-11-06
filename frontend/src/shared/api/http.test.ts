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
