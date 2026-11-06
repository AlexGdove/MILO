import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { Product } from '@/entities/product';
import type { RecipeDraft } from '@/entities/recipe';

import { RecipeForm } from './RecipeForm';

const per100g = { kcal: 100, protein: 1, fat: 1, carbs: 1 };
const products: Product[] = [
  { id: 'rice', name: 'Рис', per100g, unit: 'g', stock: 0, minStock: 0, createdAt: 1 },
  {
    id: 'eggs',
    name: 'Яйца',
    per100g,
    unit: 'pcs',
    pieceWeight: 55,
    stock: 4,
    minStock: 0,
    createdAt: 1,
  },
];

const setup = (initial?: RecipeDraft) => {
  const onSubmit = vi.fn();
  // Выбор продукта — поиск с запросами к базам (TanStack Query, решение №55)
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RecipeForm products={products} initial={initial} submitLabel="Создать" onSubmit={onSubmit} />
    </QueryClientProvider>,
  );
  return { user: userEvent.setup(), onSubmit };
};

/** Выбор ингредиента: поле «Продукт N» → окно поиска → продукт из «Ваши продукты». */
const pick = async (user: ReturnType<typeof userEvent.setup>, row: number, name: string) => {
  await user.click(screen.getByRole('button', { name: new RegExp(`^Продукт ${row}:`) }));
  const dialog = screen.getByRole('dialog', { name: 'Выбор продукта' });
  await user.click(within(dialog).getByRole('button', { name: new RegExp(`^${name}`) }));
};

describe('RecipeForm', () => {
  it('собирает рецепт из продуктов кладовой; единица берётся у продукта', async () => {
    const { user, onSubmit } = setup();
    await user.type(screen.getByLabelText('Название'), '  Омлет с рисом ');
    await user.clear(screen.getByLabelText('Порций'));
    await user.type(screen.getByLabelText('Порций'), '3');

    await pick(user, 1, 'Яйца');
    expect(screen.getByText('шт')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Количество 1'), '1,5');

    await user.click(screen.getByRole('button', { name: '+ Ингредиент' }));
    await pick(user, 2, 'Рис');
    await user.type(screen.getByLabelText('Количество 2'), '150');

    await user.click(screen.getByRole('button', { name: 'Создать' }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Омлет с рисом',
      servings: 3,
      ingredients: [
        { productId: 'eggs', amount: 1.5, unit: 'pcs' },
        { productId: 'rice', amount: 150, unit: 'g' },
      ],
    });
  });

  it('не отправляет форму с ошибками и показывает их', async () => {
    const { user, onSubmit } = setup();
    await user.clear(screen.getByLabelText('Порций'));
    await user.type(screen.getByLabelText('Порций'), '0');
    await user.click(screen.getByRole('button', { name: 'Создать' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Введите название')).toBeInTheDocument();
    expect(screen.getByText('Целое число от 1')).toBeInTheDocument();
    expect(screen.getByText('Выберите продукт')).toBeInTheDocument();
  });

  it('не допускает один продукт дважды и нулевое количество', async () => {
    const { user, onSubmit } = setup();
    await user.type(screen.getByLabelText('Название'), 'Рис');
    await pick(user, 1, 'Рис');
    await user.type(screen.getByLabelText('Количество 1'), '0');
    await user.click(screen.getByRole('button', { name: '+ Ингредиент' }));
    await pick(user, 2, 'Рис');
    await user.type(screen.getByLabelText('Количество 2'), '100');
    await user.click(screen.getByRole('button', { name: 'Создать' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Количество больше нуля')).toBeInTheDocument();
  });

  it('без ингредиентов рецепт не сохраняется', async () => {
    const { user, onSubmit } = setup();
    await user.type(screen.getByLabelText('Название'), 'Пусто');
    await user.click(screen.getByRole('button', { name: 'Убрать ингредиент 1' }));
    await user.click(screen.getByRole('button', { name: 'Создать' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Добавьте хотя бы один ингредиент')).toBeInTheDocument();
  });

  it('при правке заполняется данными рецепта', () => {
    setup({
      name: 'Омлет',
      servings: 2,
      ingredients: [{ productId: 'eggs', amount: 3, unit: 'pcs' }],
    });
    expect(screen.getByLabelText('Название')).toHaveValue('Омлет');
    expect(screen.getByRole('button', { name: 'Продукт 1: Яйца' })).toBeInTheDocument();
    expect(screen.getByLabelText('Количество 1')).toHaveValue('3');
  });
});
