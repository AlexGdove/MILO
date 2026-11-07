import { OUTBOX_MAX_ATTEMPTS, retryDelayMs, safeErrorMessage } from './outbox.retry.js';

describe('retryDelayMs', () => {
  it('пауза удваивается: 10 с, 20 с, 40 с', () => {
    expect([1, 2, 3].map(retryDelayMs)).toEqual([10_000, 20_000, 40_000]);
  });

  it('не больше часа', () => {
    expect(retryDelayMs(30)).toBe(60 * 60_000);
  });

  it('все попытки укладываются в 4–12 часов', () => {
    let total = 0;
    for (let attempt = 1; attempt < OUTBOX_MAX_ATTEMPTS; attempt += 1)
      total += retryDelayMs(attempt);
    expect(total).toBeGreaterThan(4 * 60 * 60_000);
    expect(total).toBeLessThan(12 * 60 * 60_000);
  });
});

describe('safeErrorMessage', () => {
  it('скрывает токен бота в адресе запроса', () => {
    const message = safeErrorMessage(
      new Error(
        'fetch https://api.telegram.org/bot123456:ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/getMe',
      ),
    );
    expect(message).toBe('fetch https://api.telegram.org/bot<token>/getMe');
  });

  it('обрезает длинный текст и принимает не-Error', () => {
    expect(safeErrorMessage('x'.repeat(600))).toHaveLength(500);
  });
});
