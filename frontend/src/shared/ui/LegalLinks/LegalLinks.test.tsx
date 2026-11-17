import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { isNativePlatform, getPlatform } = vi.hoisted(() => ({
  isNativePlatform: vi.fn<() => boolean>(),
  getPlatform: vi.fn<() => string>(),
}));

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform, getPlatform } }));

import { LegalLinks } from './LegalLinks';

const renderOn = (native: boolean, platform: string) => {
  isNativePlatform.mockReturnValue(native);
  getPlatform.mockReturnValue(platform);
  render(
    <MemoryRouter>
      <LegalLinks />
    </MemoryRouter>,
  );
};

describe('LegalLinks (решение №77)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it.each([
    ['сайт', false, 'web'],
    ['приложение Android', true, 'android'],
  ] as const)('%s — все четыре документа, включая тарифы', (_name, native, platform) => {
    renderOn(native, platform);

    expect(screen.getAllByRole('link')).toHaveLength(4);
    expect(screen.getByRole('link', { name: 'Тарифы' })).toHaveAttribute('href', '/tariffs');
  });

  it('приложение из App Store — без тарифов (№76 п. 6), остальные документы есть', () => {
    renderOn(true, 'ios');

    expect(screen.queryByRole('link', { name: 'Тарифы' })).not.toBeInTheDocument();
    for (const name of ['Оферта', 'Политика конфиденциальности', 'Реквизиты и контакты']) {
      expect(screen.getByRole('link', { name })).toBeInTheDocument();
    }
  });
});
