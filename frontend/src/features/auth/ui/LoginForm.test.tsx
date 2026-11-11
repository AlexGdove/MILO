import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/shared/api';

import { LoginForm } from './LoginForm';

type Submit = (values: { email: string; password: string }) => Promise<void>;

describe('LoginForm', () => {
  it('вызывает onSubmit с почтой без пробелов по краям и паролем как есть', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<Submit>().mockResolvedValue(undefined);
    render(<LoginForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Почта'), ' anna@example.com ');
    await user.type(screen.getByLabelText('Пароль'), ' secret ');
    await user.click(screen.getByRole('button', { name: 'Войти' }));

    expect(onSubmit).toHaveBeenCalledWith({ email: 'anna@example.com', password: ' secret ' });
  });

  it('пустые поля — ошибки полей, onSubmit не вызван, общей ошибки нет', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<Submit>();
    render(<LoginForm onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: 'Войти' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Введите почту')).toBeInTheDocument();
    expect(screen.getByText('Введите пароль')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('ошибка сервера — текст под формой', async () => {
    const user = userEvent.setup();
    const onSubmit = vi
      .fn<Submit>()
      .mockRejectedValue(new ApiError(401, 'invalid_credentials', 'x'));
    render(<LoginForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Почта'), 'test@test.com');
    await user.type(screen.getByLabelText('Пароль'), 'password');
    await user.click(screen.getByRole('button', { name: 'Войти' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Неверная почта или пароль.');
  });

  it('«глазик» показывает пароль и не отправляет форму', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<Submit>();
    render(<LoginForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Пароль'), 'secret');
    await user.click(screen.getByRole('button', { name: 'Показать пароль' }));

    expect(screen.getByLabelText('Пароль')).toHaveAttribute('type', 'text');
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.queryByText('Введите почту')).toBeNull();
  });

  it('defaultEmail подставляется в поле почты', () => {
    render(<LoginForm defaultEmail="anna@example.com" onSubmit={vi.fn<Submit>()} />);
    expect(screen.getByLabelText('Почта')).toHaveValue('anna@example.com');
  });
});
