import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { useCookedDishStore } from '@/entities/cooked-dish';
import { useMealEntryStore } from '@/entities/meal-entry';
import { selectProductById, useProductStore } from '@/entities/product';
import { useRecipeStore } from '@/entities/recipe';
import { useShoppingStore } from '@/entities/shopping-item';
import { RemoveMealEntryButton } from '@/features/remove-meal-entry';
import { RecipePage } from '@/pages/recipe';
import { RecipesPage } from '@/pages/recipes';
import { ROUTES } from '@/shared/config';

const per100g = { kcal: 150, protein: 12, fat: 10, carbs: 1 };

const setup = () => {
  const eggs = useProductStore.getState().addProduct({
    name: 'Яйца',
    per100g,
    unit: 'pcs',
    pieceWeight: 50,
    stock: 2,
    minStock: 0,
  });
  const milk = useProductStore.getState().addProduct({
    name: 'Молоко',
    per100g: { kcal: 50, protein: 3, fat: 2, carbs: 5 },
    unit: 'ml',
    stock: 1000,
    minStock: 0,
  });
  const recipe = useRecipeStore.getState().addRecipe({
    name: 'Омлет',
    servings: 2,
    ingredients: [
      { productId: eggs.id, amount: 4, unit: 'pcs' },
      { productId: milk.id, amount: 100, unit: 'ml' },
    ],
  });
  const router = createMemoryRouter(
    [
      { path: ROUTES.recipes, element: <RecipesPage /> },
      { path: ROUTES.recipe, element: <RecipePage /> },
    ],
    { initialEntries: [`/recipes/${recipe.id}`] },
  );
  render(<RouterProvider router={router} />);
  return { user: userEvent.setup(), router, eggs, milk };
};

const stockOf = (id: string) => selectProductById(id)(useProductStore.getState())?.stock;

beforeEach(() => {
  useProductStore.setState({ products: [] });
  useRecipeStore.setState(useRecipeStore.getInitialState(), true);
  useCookedDishStore.setState(useCookedDishStore.getInitialState(), true);
  useMealEntryStore.setState(useMealEntryStore.getInitialState(), true);
  useShoppingStore.setState(useShoppingStore.getInitialState(), true);
});

describe('готовка по рецепту', () => {
  it('рецепт → решение по нехватке → готовка → «Приготовленные» → порция на «Сегодня» → возврат', async () => {
    const { user, router, eggs, milk } = setup();

    await user.click(screen.getByRole('button', { name: 'Приготовить' }));
    const dialog = screen.getByRole('dialog');
    const cook = within(dialog).getByRole('button', { name: 'Решите по недостающим (1)' });
    expect(cook).toBeDisabled();

    // Решение пользователя: недостающие яйца — в покупки
    await user.click(within(dialog).getByRole('radio', { name: 'В покупки' }));
    await user.click(within(dialog).getByRole('button', { name: 'Приготовить 2 порц.' }));

    // Списано доступное, недостающее — в покупках, открыты «Приготовленные»
    expect(stockOf(eggs.id)).toBe(0);
    expect(stockOf(milk.id)).toBe(900);
    expect(useShoppingStore.getState().items).toMatchObject([
      { productId: eggs.id, amount: 2, unit: 'pcs' },
    ]);
    expect(router.state.location.search).toBe('?tab=cooked');
    const card = screen.getByRole('article');
    expect(card).toHaveTextContent('Омлет');
    expect(card).toHaveTextContent('2 из 2 порц.');
    // 2 яйца (100 г) + 100 мл молока = 200 г на 2 порции → порция 100 г, 100 ккал
    expect(card).toHaveTextContent('Порция 100 г · 100 ккал');

    await user.click(within(card).getByRole('button', { name: 'Съесть порцию' }));
    await user.click(screen.getByRole('button', { name: 'Записать' }));
    expect(screen.getByRole('article')).toHaveTextContent('1 из 2 порц.');

    const [entry] = useMealEntryStore.getState().entries;
    expect(entry).toMatchObject({ productName: 'Омлет', grams: 100, stockDeducted: 1 });
    expect(entry?.source.type).toBe('recipe');

    // История показывает готовку и съеденное
    await user.click(screen.getByRole('tab', { name: 'История' }));
    expect(screen.getByText('Приготовлено: Омлет, 2 порц.')).toBeInTheDocument();
    expect(screen.getByText(/^Съедено: Омлет, 1 порц\./)).toBeInTheDocument();

    // Удаление записи на «Сегодня» возвращает порцию
    if (!entry) throw new Error('нет записи');
    render(<RemoveMealEntryButton entry={entry} />);
    await user.click(screen.getByRole('button', { name: 'Удалить Омлет' }));
    expect(useCookedDishStore.getState().dishes[0]?.servingsLeft).toBe(2);
  });

  it('«Недостающее — в покупки» добавляет нехватку только по нажатию', async () => {
    const { user, eggs } = setup();
    expect(useShoppingStore.getState().items).toEqual([]);

    await user.click(screen.getByRole('button', { name: 'Недостающее — в покупки (1)' }));

    expect(useShoppingStore.getState().items).toMatchObject([
      { productId: eggs.id, amount: 2, unit: 'pcs' },
    ]);
    expect(screen.getByText('Добавлено в покупки: 1')).toHaveAttribute('role', 'status');
  });
});
