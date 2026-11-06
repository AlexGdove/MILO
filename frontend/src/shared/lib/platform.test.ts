import { describe, expect, it, vi } from 'vitest';

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }));

import { isIos } from './platform';

const nav = (userAgent: string, maxTouchPoints = 0) => ({ userAgent, maxTouchPoints });

describe('isIos', () => {
  it.each([
    ['iPhone', nav('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')],
    ['iPad', nav('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)')],
    ['iPad как Mac (сенсорный экран)', nav('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5)],
  ])('%s → да', (_name, n) => {
    expect(isIos(n)).toBe(true);
  });

  it.each([
    ['Android', nav('Mozilla/5.0 (Linux; Android 15; Pixel 9) Chrome/140', 5)],
    ['Mac без сенсора', nav('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0)],
    ['Windows', nav('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')],
  ])('%s → нет', (_name, n) => {
    expect(isIos(n)).toBe(false);
  });
});
