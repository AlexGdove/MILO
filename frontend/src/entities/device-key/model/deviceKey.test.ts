import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/shared/api';

import { ensureDeviceKey, useDeviceKeyStore, withDeviceKey } from './deviceKey';

const KEY_A = `mk_${'a'.repeat(43)}`;
const KEY_B = `mk_${'b'.repeat(43)}`;
const fetchMock = vi.fn<typeof fetch>();
const issued = (key: string) =>
  new Response(JSON.stringify({ key }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });

beforeEach(() => {
  localStorage.clear();
  useDeviceKeyStore.setState({ key: null });
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('VITE_API_URL', '/api/v1');
});

describe('ключ устройства', () => {
  it('нет ключа — получает у сервера и запоминает', async () => {
    fetchMock.mockResolvedValueOnce(issued(KEY_A));
    await expect(ensureDeviceKey()).resolves.toBe(KEY_A);
    expect(useDeviceKeyStore.getState().key).toBe(KEY_A);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/device-keys',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('ключ есть — сервер не спрашивает', async () => {
    useDeviceKeyStore.setState({ key: KEY_A });
    await expect(ensureDeviceKey()).resolves.toBe(KEY_A);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('сервер не знает ключ — получает новый и повторяет запрос один раз', async () => {
    useDeviceKeyStore.setState({ key: KEY_A });
    fetchMock.mockResolvedValueOnce(issued(KEY_B));
    const request = vi
      .fn<(key: string) => Promise<string>>()
      .mockRejectedValueOnce(new ApiError(401, 'device_key_invalid', 'Unknown'))
      .mockResolvedValueOnce('ok');

    await expect(withDeviceKey(request)).resolves.toBe('ok');
    expect(request.mock.calls.map(([key]) => key)).toEqual([KEY_A, KEY_B]);
    expect(useDeviceKeyStore.getState().key).toBe(KEY_B);
  });

  it('другие ошибки не меняют ключ и пробрасываются', async () => {
    useDeviceKeyStore.setState({ key: KEY_A });
    const failure = new ApiError(429, 'rate_limited', 'Too many');
    await expect(withDeviceKey(() => Promise.reject(failure))).rejects.toBe(failure);
    expect(useDeviceKeyStore.getState().key).toBe(KEY_A);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('повреждённое значение в хранилище — как будто ключа нет', async () => {
    localStorage.setItem(
      'milo:device-key',
      JSON.stringify({ state: { key: 'не ключ' }, version: 0 }),
    );
    await useDeviceKeyStore.persist.rehydrate();
    expect(useDeviceKeyStore.getState().key).toBeNull();
  });
});
