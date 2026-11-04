import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ProductForm } from './ProductForm';

describe('ProductForm', () => {
  it('не отправляет пустую форму и показывает ошибки', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ProductForm submitLabel="Добавить" onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: 'Добавить' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Введите название')).toBeInTheDocument();
    // ккал, белки, жиры, углеводы пустые; остаток по умолчанию 0 — валиден
    expect(screen.getAllByText('Число ≥ 0')).toHaveLength(4);
  });

  it('отклоняет отрицательные значения', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ProductForm submitLabel="Добавить" onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Название'), 'Тест');
    await user.type(screen.getByLabelText('Ккал / 100 г'), '-5');
    await user.type(screen.getByLabelText('Белки, г'), '1');
    await user.type(screen.getByLabelText('Жиры, г'), '1');
    await user.type(screen.getByLabelText('Углеводы, г'), '1');
    await user.click(screen.getByRole('button', { name: 'Добавить' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Ккал / 100 г')).toHaveAttribute('aria-invalid', 'true');
  });

  it('отправляет нормализованный продукт (запятая, пробелы в названии)', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ProductForm submitLabel="Добавить" onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Название'), '  Сырники  ');
    await user.type(screen.getByLabelText('Ккал / 100 г'), '220');
    await user.type(screen.getByLabelText('Белки, г'), '15,5');
    await user.type(screen.getByLabelText('Жиры, г'), '9');
    await user.type(screen.getByLabelText('Углеводы, г'), '20');
    await user.clear(screen.getByLabelText('В наличии, г'));
    await user.type(screen.getByLabelText('В наличии, г'), '500');
    await user.click(screen.getByRole('button', { name: 'Добавить' }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Сырники',
      per100g: { kcal: 220, protein: 15.5, fat: 9, carbs: 20 },
      stock: 500,
    });
  });

  it('при редактировании заполняет поля и показывает кнопку удаления', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(
      <ProductForm
        submitLabel="Сохранить"
        initial={{
          name: 'Банан',
          per100g: { kcal: 96, protein: 1.5, fat: 0.5, carbs: 21 },
          stock: 0,
        }}
        onSubmit={vi.fn()}
        onDelete={onDelete}
      />,
    );

    expect(screen.getByLabelText('Название')).toHaveValue('Банан');
    expect(screen.getByLabelText('Белки, г')).toHaveValue('1.5');

    await user.click(screen.getByRole('button', { name: 'Удалить продукт' }));
    expect(onDelete).toHaveBeenCalledOnce();
  });
});
