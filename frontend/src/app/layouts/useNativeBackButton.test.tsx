import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { backButtonAction, useNativeBackButton } from './useNativeBackButton';

// Плагины Capacitor подменены: тест сам «нажимает» кнопку «Назад»
const native = vi.hoisted(() => ({
  isNative: true,
  handler: null as null | ((event: { canGoBack: boolean }) => void),
  exitApp: vi.fn(),
  removed: vi.fn(),
}));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => native.isNative } }));
vi.mock('@capacitor/app', () => ({
  App: {
    addListener: (_event: string, handler: (event: { canGoBack: boolean }) => void) => {
      native.handler = handler;
      return Promise.resolve({ remove: native.removed });
    },
    exitApp: native.exitApp,
  },
}));

const Where = () => {
  useNativeBackButton();
  return <p data-testid="where">{useLocation().pathname}</p>;
};

const renderAt = (entries: string[]) =>
  render(
    <MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}>
      <Routes>
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );

const press = (canGoBack: boolean) => act(() => native.handler?.({ canGoBack }));

beforeEach(() => {
  native.isNative = true;
  native.handler = null;
  native.exitApp.mockReset();
  native.removed.mockReset();
  document.body.innerHTML = '';
});

describe('кнопка «Назад» Android (решение №44)', () => {
  it('backButtonAction: диалог → закрыть; есть история → назад; иначе выйти', () => {
    expect(backButtonAction(true)).toBe('back');
    expect(backButtonAction(false)).toBe('exit');
    const dialog = document.createElement('dialog');
    dialog.setAttribute('open', '');
    document.body.append(dialog);
    expect(backButtonAction(true)).toBe('close-dialog');
  });

  it('есть куда вернуться — шаг назад по истории', () => {
    renderAt(['/', '/settings']);
    press(true);
    expect(screen.getByTestId('where').textContent).toBe('/');
    expect(native.exitApp).not.toHaveBeenCalled();
  });

  it('некуда вернуться — выход из приложения', () => {
    renderAt(['/']);
    press(false);
    expect(native.exitApp).toHaveBeenCalledOnce();
  });

  it('открытый диалог закрывается, страница остаётся', () => {
    renderAt(['/', '/settings']);
    const dialog = document.createElement('dialog');
    dialog.setAttribute('open', '');
    document.body.append(dialog);
    press(true);
    expect(dialog.hasAttribute('open')).toBe(false);
    expect(screen.getByTestId('where').textContent).toBe('/settings');
  });

  it('в браузере (не нативная платформа) кнопку не перехватывает', () => {
    native.isNative = false;
    renderAt(['/']);
    expect(native.handler).toBeNull();
  });

  it('при уходе со страницы обработчик снимается', async () => {
    const { unmount } = renderAt(['/']);
    unmount();
    await Promise.resolve();
    expect(native.removed).toHaveBeenCalledOnce();
  });
});
