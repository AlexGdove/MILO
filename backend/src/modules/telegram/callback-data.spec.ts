import { encodeCallback, parseCallback } from './callback-data.js';

const ID = '0b6f6c1e-2d3a-4c5b-8e9f-112233445566';

describe('callback-data', () => {
  it.each(['approve', 'reject', 'block', 'unblock'] as const)(
    '%s: кодирование и разбор дают исходные данные',
    (action) => {
      expect(parseCallback(encodeCallback(action, ID))).toEqual({ action, submissionId: ID });
    },
  );

  it('кодирует коротко: буква действия и id', () => {
    expect(encodeCallback('approve', ID)).toBe(`a:${ID}`);
    expect(encodeCallback('unblock', ID)).toBe(`u:${ID}`);
  });

  it('данные кнопки не длиннее 64 байт', () => {
    expect(Buffer.byteLength(encodeCallback('block', ID))).toBeLessThanOrEqual(64);
  });

  it.each([
    undefined,
    '',
    'a',
    `x:${ID}`,
    'a:not-a-uuid',
    `a:${ID}:extra`,
    `a:${ID.toUpperCase()}`,
  ])('отклоняет %p', (data) => {
    expect(parseCallback(data)).toBeNull();
  });
});
