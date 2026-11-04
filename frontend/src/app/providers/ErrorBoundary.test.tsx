import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ErrorBoundary } from './ErrorBoundary';

const Broken = (): never => {
  throw new Error('boom');
};

describe('ErrorBoundary', () => {
  it('показывает дочерние элементы без ошибок', () => {
    render(
      <ErrorBoundary>
        <p>Контент</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('Контент')).toBeInTheDocument();
  });

  it('показывает экран ошибки и пишет её в консоль', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Что-то пошло не так');
    expect(consoleError).toHaveBeenCalledWith(
      'MILO: необработанная ошибка интерфейса',
      expect.any(Error),
      expect.any(String),
    );
  });

  it('кнопка перезагружает страницу', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const reload = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload });

    const user = userEvent.setup();
    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    );
    await user.click(screen.getByRole('button', { name: 'Перезагрузить' }));
    expect(reload).toHaveBeenCalledOnce();
  });
});
