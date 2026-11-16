import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError, NETWORK_ERROR } from '@/shared/api';

import { PHOTO_REQUEST_TIMEOUT_MS, photoAiApi, photoErrorText } from './photoAiApi';

const TOKEN = `ms_${'a'.repeat(43)}`;
const RECOGNITION = { dish: 'Суп', ingredients: [], usage: { used: 1, limit: 20 } };

describe('photoAiApi.recognize', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubEnv('VITE_API_URL', 'https://api.test/api/v1');
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(RECOGNITION), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  const sentBody = (): unknown => JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));

  it('шлёт фото и описание с токеном сессии', async () => {
    const result = await photoAiApi.recognize(TOKEN, 'BASE64', '  пельмени  ');

    expect(result).toEqual(RECOGNITION);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('https://api.test/api/v1/photo-ai/recognize');
    expect(init?.method).toBe('POST');
    expect(new Headers(init?.headers).get('authorization')).toBe(`Bearer ${TOKEN}`);
    expect(sentBody()).toEqual({ image: 'BASE64', hint: 'пельмени' });
  });

  it('пустое описание не отправляет', async () => {
    await photoAiApi.recognize(TOKEN, 'BASE64', '   ');
    expect(sentBody()).toEqual({ image: 'BASE64' });
  });

  it('ждёт ответа дольше обычного запроса: модель отвечает десятки секунд', () => {
    expect(PHOTO_REQUEST_TIMEOUT_MS).toBeGreaterThanOrEqual(120_000);
  });
});

describe('photoErrorText', () => {
  it.each([
    ['photo_ai_plan_required', 'платном тарифе'],
    ['photo_ai_limit', 'Лимит распознаваний'],
    ['photo_ai_busy', 'много запросов'],
    ['photo_ai_unavailable', 'недоступно'],
    ['photo_no_food', 'не видно еды'],
    ['photo_invalid', 'не подходит'],
    ['session_invalid', 'Войдите в аккаунт заново'],
    [NETWORK_ERROR, 'Нет связи с сервером'],
  ])('код %s → понятный текст', (code, part) => {
    expect(photoErrorText(new ApiError(400, code, 'x'))).toContain(part);
  });

  it('незнакомый код и не-ApiError → общий текст', () => {
    const fallback = 'Не получилось распознать фото — попробуйте ещё раз';
    expect(photoErrorText(new ApiError(500, 'something_new', 'x'))).toBe(fallback);
    expect(photoErrorText(new Error('boom'))).toBe(fallback);
    expect(photoErrorText(null)).toBe(fallback);
  });
});
