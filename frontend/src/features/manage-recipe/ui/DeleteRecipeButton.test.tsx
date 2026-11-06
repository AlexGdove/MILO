import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useRecipeStore, type Recipe } from '@/entities/recipe';

import { DeleteRecipeButton } from './DeleteRecipeButton';

let recipe: Recipe;
const recipes = () => useRecipeStore.getState().recipes;
const dialog = () => screen.getByRole('dialog', { name: 'Удалить рецепт?' });

beforeEach(() => {
  useRecipeStore.setState({ recipes: [] });
  recipe = useRecipeStore.getState().addRecipe({ name: 'Омлет', servings: 2, ingredients: [] });
});

describe('DeleteRecipeButton', () => {
  it('корзина открывает своё окно с названием; «Отмена» — рецепт остаётся', async () => {
    const user = userEvent.setup();
    const onDeleted = vi.fn();
    render(<DeleteRecipeButton recipe={recipe} onDeleted={onDeleted} />);

    await user.click(screen.getByRole('button', { name: 'Удалить рецепт' }));
    expect(within(dialog()).getByText(/«Омлет» удалится с этого устройства/)).toBeInTheDocument();
    await user.click(within(dialog()).getByRole('button', { name: 'Отмена' }));

    expect(recipes()).toEqual([recipe]);
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it('«Удалить» — рецепта нет, onDeleted вызван один раз, системный confirm не нужен', async () => {
    const user = userEvent.setup();
    const onDeleted = vi.fn();
    const confirmSpy = vi.spyOn(window, 'confirm');
    render(<DeleteRecipeButton recipe={recipe} onDeleted={onDeleted} />);

    await user.click(screen.getByRole('button', { name: 'Удалить рецепт' }));
    await user.click(within(dialog()).getByRole('button', { name: 'Удалить' }));

    expect(recipes()).toEqual([]);
    expect(onDeleted).toHaveBeenCalledTimes(1);
    expect(confirmSpy).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });
});
