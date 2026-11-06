import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// jsdom не реализует matchMedia, а модуль установки PWA проверяет режим standalone при импорте
const platform = vi.hoisted(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
  return { native: false };
});
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => platform.native } }));

import { ANDROID_APK_URL } from '@/shared/config';

import { AppPage } from './AppPage';

const renderPage = () =>
  render(
    <MemoryRouter>
      <AppPage />
    </MemoryRouter>,
  );

beforeEach(() => {
  platform.native = false;
});

describe('Страница «Приложение»: APK для Android (решение №46)', () => {
  it('в браузере — ссылка на последнюю сборку, файл скачивается сразу', () => {
    renderPage();
    const link = screen.getByRole('link', { name: 'Скачать для Android (APK)' });
    expect(link).toHaveAttribute('href', ANDROID_APK_URL);
    expect(link).toHaveAttribute('download', 'milo.apk');
    expect(ANDROID_APK_URL).toBe(
      'https://github.com/AlexGdove/MILO/releases/download/android-latest/milo.apk',
    );
  });

  it('в самом Android-приложении ссылки нет — оно уже установлено', () => {
    platform.native = true;
    renderPage();
    expect(screen.queryByRole('link', { name: /Скачать для Android/ })).not.toBeInTheDocument();
  });
});
