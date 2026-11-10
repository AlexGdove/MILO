import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { Input } from './Input';

describe('Input', () => {
  it('должен отображать label и делать поле доступным по метке', () => {
    render(<Input label="Название" />);
    expect(screen.getByLabelText('Название')).toBeInTheDocument();
  });

  it('не должен рендерить кнопку, если action не передан', () => {
    render(<Input label="Тест" />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('должен рендерить action-кнопку и располагать её рядом с полем ввода', () => {
    render(<Input label="Тест" action={<button type="button">Скан</button>} />);

    const input = screen.getByLabelText('Тест');
    const button = screen.getByRole('button', { name: 'Скан' });

    expect(input.parentElement).toContainElement(button);
  });

  it('должен устанавливать aria-invalid="true" при наличии ошибки и "false" без неё', () => {
    const { rerender } = render(<Input label="Тест" error="Неверно" />);
    const inputWithError = screen.getByLabelText('Тест');
    expect(inputWithError).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Неверно')).toBeInTheDocument();

    rerender(<Input label="Тест" />);
    const inputWithoutError = screen.getByLabelText('Тест');
    expect(inputWithoutError).toHaveAttribute('aria-invalid', 'false');
  });

  it('должен корректно обрабатывать ввод текста в неуправляемом поле', async () => {
    const user = userEvent.setup();
    render(<Input label="Ввод" />);
    const input = screen.getByLabelText('Ввод');

    await user.type(input, 'abc');

    expect(input).toHaveValue('abc');
  });
});
