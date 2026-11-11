import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ResetPasswordForm } from './ResetPasswordForm';

type Submit = (values: { code: string; password: string }) => Promise<void>;

const fill = async (code: string, password: string, repeat = password) => {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Код из письма'), code);
  await user.type(screen.getByLabelText('Новый пароль'), password);
  await user.type(screen.getByLabelText('Повторите пароль'), repeat);
  await user.click(screen.getByRole('button', { name: 'Сохранить пароль' }));
};

const setup = () => {
  const onSubmit = vi.fn<Submit>().mockResolvedValue(undefined);
  const onResend = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
  render(<ResetPasswordForm email="anna@example.com" onSubmit={onSubmit} onResend={onResend} />);
  return { onSubmit, onResend };
};

describe('ResetPasswordForm', () => {
  it('отправляет код и новый пароль', async () => {
    const { onSubmit } = setup();
    await fill('123456', 'new password');
    expect(onSubmit).toHaveBeenCalledWith({ code: '123456', password: 'new password' });
  });

  it('пароли не совпадают — не отправляется', async () => {
    const { onSubmit } = setup();
    await fill('123456', 'new password', 'different');
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Пароли не совпадают')).toBeInTheDocument();
  });

  it('короткий пароль — поле отмечено', async () => {
    const { onSubmit } = setup();
    await fill('123456', '1234567');
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Новый пароль')).toHaveAttribute('aria-invalid', 'true');
  });

  it('неполный код — не отправляется', async () => {
    const { onSubmit } = setup();
    await fill('12', 'new password');
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Введите 6 цифр из письма')).toBeInTheDocument();
  });
});
