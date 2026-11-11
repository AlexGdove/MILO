import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ForgotPasswordForm } from './ForgotPasswordForm';

type Submit = (values: { email: string }) => Promise<void>;

describe('ForgotPasswordForm', () => {
  it('отправляет почту без пробелов по краям', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<Submit>().mockResolvedValue(undefined);
    render(<ForgotPasswordForm defaultEmail=" anna@example.com " onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: 'Получить код' }));
    expect(onSubmit).toHaveBeenCalledWith({ email: 'anna@example.com' });
  });

  it('пустая почта — ошибка поля, onSubmit не вызван', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<Submit>();
    render(<ForgotPasswordForm onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: 'Получить код' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Введите почту')).toBeInTheDocument();
  });
});
