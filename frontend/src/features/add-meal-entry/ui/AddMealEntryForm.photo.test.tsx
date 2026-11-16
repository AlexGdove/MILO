import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AddMealEntryForm } from './AddMealEntryForm';

const { paidFeaturesAvailable } = vi.hoisted(() => ({
  paidFeaturesAvailable: vi.fn<() => boolean>(() => true),
}));

vi.mock('@/shared/lib', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  paidFeaturesAvailable,
}));

const PHOTO_BUTTON = { name: 'Распознать блюдо по фото' };

const renderForm = () =>
  render(<AddMealEntryForm date="2026-11-16" initialMealType="lunch" onDone={vi.fn()} />);

afterEach(() => {
  paidFeaturesAvailable.mockReturnValue(true);
  vi.unstubAllEnvs();
});

describe('AddMealEntryForm: кнопка фото', () => {
  it('сервер подключён и платные функции доступны — кнопка есть', () => {
    vi.stubEnv('VITE_API_URL', 'https://api.test/api/v1');
    renderForm();

    expect(screen.getByRole('button', PHOTO_BUTTON)).toBeInTheDocument();
  });

  it('приложение из App Store (платные функции недоступны) — кнопки нет', () => {
    vi.stubEnv('VITE_API_URL', 'https://api.test/api/v1');
    paidFeaturesAvailable.mockReturnValue(false);
    renderForm();

    expect(screen.queryByRole('button', PHOTO_BUTTON)).not.toBeInTheDocument();
  });

  it('сервер не подключён — кнопки нет', () => {
    vi.stubEnv('VITE_API_URL', '');
    vi.stubEnv('MODE', 'production');
    renderForm();

    expect(screen.queryByRole('button', PHOTO_BUTTON)).not.toBeInTheDocument();
  });
});
