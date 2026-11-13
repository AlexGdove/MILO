import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/shared/api';

import { RegisterForm } from './RegisterForm';

type Submit = (values: { email: string; password: string }) => Promise<void>;

const fill = async (email: string, password: string, repeat = password) => {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Почта'), email);
  await user.type(screen.getByLabelText('Пароль'), password);
  await user.type(screen.getByLabelText('Повторите пароль'), repeat);
  await user.click(screen.getByRole('button', { name: 'Зарегистрироваться' }));
};

describe('RegisterForm', () => {
  it('вызывает onSubmit с корректными данными', async () => {
    const onSubmit = vi.fn<Submit>().mockResolvedValue(undefined);
    render(<RegisterForm onSubmit={onSubmit} />);
    await fill('test@test.com', 'password123');
    expect(onSubmit).toHaveBeenCalledWith({ email: 'test@test.com', password: 'password123' });
  });

  it('короткий пароль — поле отмечено, onSubmit не вызван', async () => {
    const onSubmit = vi.fn<Submit>();
    render(<RegisterForm onSubmit={onSubmit} />);
    await fill('test@test.com', '1234567');
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Пароль')).toHaveAttribute('aria-invalid', 'true');
    // Ошибка поля — отдельно от подсказки под полем (в подсказке ещё и про латиницу)
    expect(screen.getByText('Не меньше 8 символов')).toBeInTheDocument();
    expect(
      screen.getByText('Не меньше 8 символов, латинскими буквами, цифрами и знаками'),
    ).toBeInTheDocument();
  });

  it('пароль кириллицей не принимается — подсказка про раскладку', async () => {
    const onSubmit = vi.fn<Submit>();
    render(<RegisterForm onSubmit={onSubmit} />);
    await fill('test@test.com', 'пароль12345');
    expect(
      screen.getByText('Только латиница — похоже, включена русская раскладка'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Пароль')).toHaveAttribute('aria-invalid', 'true');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('пароль из пробелов не принимается', async () => {
    const onSubmit = vi.fn<Submit>();
    render(<RegisterForm onSubmit={onSubmit} />);
    await fill('test@test.com', '         ');
    expect(screen.getByText('Пароль не может состоять из пробелов')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('пароли не совпадают', async () => {
    const onSubmit = vi.fn<Submit>();
    render(<RegisterForm onSubmit={onSubmit} />);
    await fill('test@test.com', 'password123', 'different1');
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Повторите пароль')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Пароли не совпадают')).toBeInTheDocument();
  });

  it('занятая почта — текст под формой', async () => {
    const onSubmit = vi.fn<Submit>().mockRejectedValue(new ApiError(409, 'email_taken', 'x'));
    render(<RegisterForm onSubmit={onSubmit} />);
    await fill('taken@test.com', 'password123');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Эта почта уже зарегистрирована. Войдите или восстановите пароль.',
    );
  });
});
