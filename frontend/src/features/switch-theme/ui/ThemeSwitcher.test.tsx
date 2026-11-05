import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { ThemeSwitcher } from './ThemeSwitcher';
import { THEME_STORAGE_KEY, useThemeStore } from '../model/theme';
import { useApplyTheme } from '../model/useApplyTheme';

/** Как в приложении: тема применяется в корне, переключатель — в профиле. */
const Harness = () => {
  useApplyTheme();
  return <ThemeSwitcher />;
};

beforeEach(() => {
  localStorage.clear();
  useThemeStore.setState(useThemeStore.getInitialState(), true);
  delete document.documentElement.dataset.theme;
});

describe('ThemeSwitcher', () => {
  it('по умолчанию выбрано «Авто», атрибута темы нет', () => {
    render(<Harness />);
    expect(screen.getByRole('radio', { name: 'Авто' })).toBeChecked();
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it('«Тёмная» включает тёмную тему и запоминается в формате, который читает index.html', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('radio', { name: 'Тёмная' }));

    expect(document.documentElement.dataset.theme).toBe('dark');
    const saved = JSON.parse(localStorage.getItem(THEME_STORAGE_KEY) ?? 'null') as {
      state?: { theme?: string };
    } | null;
    expect(THEME_STORAGE_KEY).toBe('milo:theme');
    expect(saved?.state?.theme).toBe('dark');
  });

  it('возврат к «Авто» снимает явную тему', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('radio', { name: 'Светлая' }));
    expect(document.documentElement.dataset.theme).toBe('light');
    await user.click(screen.getByRole('radio', { name: 'Авто' }));
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });
});
