import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/shared/api';

import { CodeForm } from './CodeForm';

const setup = (
  onSubmit = vi.fn<(code: string) => Promise<void>>().mockResolvedValue(undefined),
) => {
  const onResend = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
  render(<CodeForm email="anna@example.com" onSubmit={onSubmit} onResend={onResend} />);
  return { user: userEvent.setup(), onSubmit, onResend };
};

describe('CodeForm', () => {
  it('оставляет только цифры и отправляет код', async () => {
    const { user, onSubmit, onResend } = setup();
    const input = screen.getByLabelText('Код из письма');
    await user.type(input, 'a12-34 56');
    expect(input).toHaveValue('123456');

    await user.click(screen.getByRole('button', { name: 'Подтвердить' }));
    expect(onSubmit).toHaveBeenCalledWith('123456');
    expect(onResend).not.toHaveBeenCalled();
  });

  it('неполный код — ошибка поля после отправки, onSubmit не вызван', async () => {
    const { user, onSubmit } = setup();
    await user.type(screen.getByLabelText('Код из письма'), '123');
    expect(screen.queryByText('Введите 6 цифр из письма')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Подтвердить' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Введите 6 цифр из письма')).toBeInTheDocument();
  });

  it('неверный код — текст под формой', async () => {
    const { user } = setup(
      vi
        .fn<(code: string) => Promise<void>>()
        .mockRejectedValue(new ApiError(401, 'code_invalid', 'x')),
    );
    await user.type(screen.getByLabelText('Код из письма'), '123456');
    await user.click(screen.getByRole('button', { name: 'Подтвердить' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Код неверный или устарел. Запросите новый.',
    );
  });

  it('«Отправить код ещё раз» — onResend и подтверждение', async () => {
    const { user, onResend, onSubmit } = setup();
    await user.click(screen.getByRole('button', { name: 'Отправить код ещё раз' }));
    expect(onResend).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(await screen.findByText('Новый код отправлен')).toBeInTheDocument();
  });

  it('показывает, куда отправлен код', () => {
    setup();
    expect(screen.getByText(/anna@example\.com/)).toBeInTheDocument();
  });
});
