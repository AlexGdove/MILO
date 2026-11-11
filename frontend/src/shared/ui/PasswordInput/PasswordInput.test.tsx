import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { PasswordInput } from './PasswordInput';

describe('PasswordInput', () => {
  it('скрыт по умолчанию; «глазик» показывает и снова скрывает пароль', async () => {
    const user = userEvent.setup();
    render(<PasswordInput label="Пароль" />);

    const input = screen.getByLabelText('Пароль');
    const button = screen.getByRole('button', { name: 'Показать пароль' });
    expect(input).toHaveAttribute('type', 'password');
    expect(button).toHaveAttribute('aria-pressed', 'false');

    await user.click(button);
    expect(input).toHaveAttribute('type', 'text');
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveAccessibleName('Скрыть пароль');

    await user.click(button);
    expect(input).toHaveAttribute('type', 'password');
    expect(button).toHaveAccessibleName('Показать пароль');
  });

  it('введённое значение сохраняется при переключении', async () => {
    const user = userEvent.setup();
    render(<PasswordInput label="Пароль" defaultValue="secret" />);

    await user.click(screen.getByRole('button', { name: 'Показать пароль' }));
    expect(screen.getByLabelText('Пароль')).toHaveValue('secret');
  });

  it('кнопка не отправляет форму', () => {
    render(<PasswordInput label="Пароль" />);
    expect(screen.getByRole('button', { name: 'Показать пароль' })).toHaveAttribute(
      'type',
      'button',
    );
  });

  it('ошибка передаётся в поле', () => {
    render(<PasswordInput label="Пароль" error="Введите пароль" />);
    expect(screen.getByLabelText('Пароль')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Введите пароль')).toBeInTheDocument();
  });
});
