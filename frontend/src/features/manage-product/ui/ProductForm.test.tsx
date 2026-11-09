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
      unit: 'g',
      stock: 500,
      minStock: 0,
    });
  });

  it('штрихкод необязателен, но если введён — только 8–14 цифр', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ProductForm submitLabel="Добавить" onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText('Название'), 'Кефир');
    await user.type(screen.getByLabelText('Ккал / 100 г'), '50');
    await user.type(screen.getByLabelText('Белки, г'), '3');
    await user.type(screen.getByLabelText('Жиры, г'), '2');
    await user.type(screen.getByLabelText('Углеводы, г'), '4');

    const field = screen.getByLabelText('Штрихкод (необязательно)');
    await user.type(field, '12ab');
    await user.click(screen.getByRole('button', { name: 'Добавить' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('8–14 цифр, как на упаковке')).toBeInTheDocument();

    await user.clear(field);
    await user.type(field, '4600 0000 00017');
    await user.click(screen.getByRole('button', { name: 'Добавить' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ barcode: '4600000000017' }));
  });

  it('без штрихкода в продукте поля barcode нет', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ProductForm submitLabel="Добавить" onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText('Название'), 'Рис');
    await user.type(screen.getByLabelText('Ккал / 100 г'), '340');
    await user.type(screen.getByLabelText('Белки, г'), '7');
    await user.type(screen.getByLabelText('Жиры, г'), '1');
    await user.type(screen.getByLabelText('Углеводы, г'), '75');
    await user.click(screen.getByRole('button', { name: 'Добавить' }));
    expect(onSubmit.mock.calls[0]?.[0]).not.toHaveProperty('barcode');
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
          unit: 'g',
          stock: 0,
          minStock: 0,
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

  it('для штучного продукта требует вес одной штуки и сохраняет единицу и минимальный остаток', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ProductForm submitLabel="Добавить" onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Название'), 'Яйцо');
    await user.click(screen.getByRole('radio', { name: 'шт' }));
    await user.type(screen.getByLabelText('Ккал / 100 г'), '157');
    await user.type(screen.getByLabelText('Белки, г'), '12,7');
    await user.type(screen.getByLabelText('Жиры, г'), '11,5');
    await user.type(screen.getByLabelText('Углеводы, г'), '0,7');
    await user.clear(screen.getByLabelText('В наличии, шт'));
    await user.type(screen.getByLabelText('В наличии, шт'), '10');
    await user.clear(screen.getByLabelText('Мин. остаток, шт'));
    await user.type(screen.getByLabelText('Мин. остаток, шт'), '3');
    await user.click(screen.getByRole('button', { name: 'Добавить' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Укажите вес одной штуки')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Вес одной штуки, г'), '55');
    await user.click(screen.getByRole('button', { name: 'Добавить' }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Яйцо',
      per100g: { kcal: 157, protein: 12.7, fat: 11.5, carbs: 0.7 },
      unit: 'pcs',
      pieceWeight: 55,
      stock: 10,
      minStock: 3,
    });
  });

  it('для жидкостей КБЖУ вводится на 100 мл, вес штуки не нужен', async () => {
    const user = userEvent.setup();
    render(<ProductForm submitLabel="Добавить" onSubmit={vi.fn()} />);

    await user.click(screen.getByRole('radio', { name: 'мл' }));

    expect(screen.getByLabelText('Ккал / 100 мл')).toBeInTheDocument();
    expect(screen.getByLabelText('В наличии, мл')).toBeInTheDocument();
    expect(screen.queryByLabelText('Вес одной штуки, г')).not.toBeInTheDocument();
    expect(screen.getByText('Для расчёта калорий 1 мл считается равным 1 г.')).toBeInTheDocument();
  });
});
