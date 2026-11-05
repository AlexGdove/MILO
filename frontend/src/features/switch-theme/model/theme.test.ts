import { beforeEach, describe, expect, it } from 'vitest';

import { applyTheme, migrateTheme, useThemeStore } from './theme';

beforeEach(() => {
  useThemeStore.setState(useThemeStore.getInitialState(), true);
  delete document.documentElement.dataset.theme;
});

describe('useThemeStore', () => {
  it('по умолчанию — «Авто» (как в системе)', () => {
    expect(useThemeStore.getState().theme).toBe('system');
  });

  it('запоминает выбор', () => {
    useThemeStore.getState().setTheme('dark');
    expect(useThemeStore.getState().theme).toBe('dark');
  });
});

describe('migrateTheme', () => {
  it('сохранённый выбор остаётся', () => {
    expect(migrateTheme({ theme: 'light' })).toEqual({ theme: 'light' });
  });

  it('непонятное значение — «Авто»', () => {
    expect(migrateTheme({ theme: 'purple' })).toEqual({ theme: 'system' });
    expect(migrateTheme(null)).toEqual({ theme: 'system' });
    expect(migrateTheme('dark')).toEqual({ theme: 'system' });
  });
});

describe('applyTheme', () => {
  it('явная тема — атрибут data-theme на <html>', () => {
    applyTheme('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('«Авто» убирает атрибут — решает настройка системы', () => {
    applyTheme('dark');
    applyTheme('system');
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it('можно применить к другому элементу, не трогая документ', () => {
    const el = document.createElement('div');
    applyTheme('light', el);
    expect(el.dataset.theme).toBe('light');
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });
});
