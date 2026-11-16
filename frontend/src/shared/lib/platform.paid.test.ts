import { beforeEach, describe, expect, it, vi } from 'vitest';

const { isNativePlatform, getPlatform } = vi.hoisted(() => ({
  isNativePlatform: vi.fn<() => boolean>(),
  getPlatform: vi.fn<() => string>(),
}));

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform, getPlatform } }));

import { paidFeaturesAvailable } from './platform';

describe('paidFeaturesAvailable (решение №76)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it.each([
    ['сайт в браузере', false, 'web', true],
    ['PWA на iPhone (это сайт)', false, 'web', true],
    ['приложение Android', true, 'android', true],
    ['приложение из App Store', true, 'ios', false],
  ] as const)('%s → %s', (_name, native, platform, expected) => {
    isNativePlatform.mockReturnValue(native);
    getPlatform.mockReturnValue(platform);

    expect(paidFeaturesAvailable()).toBe(expected);
  });
});
