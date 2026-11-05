import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, Navigate, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { useProductStore } from '@/entities/product';
import { useRecipeStore } from '@/entities/recipe';
import { RecipePage } from '@/pages/recipe';
import { RecipesPage } from '@/pages/recipes';
import { LEGACY_ROUTES, ROUTES } from '@/shared/config';
import { BottomNav } from '@/widgets/bottom-nav';

const per100g = { kcal: 200, protein: 10, fat: 5, carbs: 20 };

const renderAt = (path: string) => {
  const router = createMemoryRouter(
    [
      { path: ROUTES.dashboard, element: <h1>Сегодня</h1> },
      { path: ROUTES.recipes, element: <RecipesPage /> },
      { path: ROUTES.recipe, element: <RecipePage /> },
      { path: LEGACY_ROUTES.diary, element: <Navigate to={ROUTES.dashboard} replace /> },
    ],
    { initialEntries: [path] },
  );
  render(<RouterProvider router={router} />);
  return { router, user: userEvent.setup() };
};

beforeEach(() => {
  useProductStore.setState({ products: [] });
  useRecipeStore.setState(useRecipeStore.getInitialState(), true);
});

describe('раздел «Рецепты»', () => {
  it('пустой раздел предлагает создать рецепт; вкладки переключаются', async () => {
    const { user, router } = renderAt('/recipes');
    expect(screen.getByText('Рецептов пока нет')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Приготовленные' }));
    expect(screen.getByText('Пока ничего не приготовлено')).toBeInTheDocument();
    expect(router.state.location.search).toBe('?tab=cooked');

    await user.click(screen.getByRole('tab', { name: 'История' }));
    expect(screen.getByText('История пуста')).toBeInTheDocument();
  });

  it('карточка показывает наличие и калории на порцию; страница — ингредиенты и пересчёт порций', async () => {
    const rice = useProductStore.getState().addProduct({
      name: 'Рис',
      per100g,
      unit: 'g',
      stock: 300,
      minStock: 0,
    });
    const eggs = useProductStore.getState().addProduct({
      name: 'Яйца',
      per100g,
      unit: 'pcs',
      pieceWeight: 50,
      stock: 1,
      minStock: 0,
    });
    useRecipeStore.getState().addRecipe({
      name: 'Рис с яйцом',
      servings: 2,
      ingredients: [
        { productId: rice.id, amount: 200, unit: 'g' }, // 400 ккал
        { productId: eggs.id, amount: 2, unit: 'pcs' }, // 100 г → 200 ккал
      ],
    });
    const { user } = renderAt('/recipes');

    const card = screen.getByRole('link', { name: /Рис с яйцом/ });
    expect(card).toHaveTextContent('2 порц. · 2 ингр. · 300 ккал/порц.');
    expect(card).toHaveTextContent('Не всего хватает');

    await user.click(card);
    expect(screen.getByRole('heading', { level: 1, name: 'Рис с яйцом' })).toBeInTheDocument();
    const list = screen.getByRole('list');
    expect(within(list).getByText('Рис — 200 г')).toBeInTheDocument();
    expect(within(list).getByText('есть 1 шт, не хватает 1 шт')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Больше порций' }));
    await user.click(screen.getByRole('button', { name: 'Больше порций' }));
    expect(screen.getByLabelText('Порций')).toHaveTextContent('4');
    expect(within(list).getByText('Рис — 400 г')).toBeInTheDocument();
    expect(within(list).getByText('есть 300 г, не хватает 100 г')).toBeInTheDocument();
  });

  it('несуществующий рецепт — понятное сообщение', () => {
    renderAt('/recipes/unknown');
    expect(screen.getByText('Рецепт не найден')).toBeInTheDocument();
  });

  it('старый адрес дневника ведёт на «Сегодня»', () => {
    const { router } = renderAt(LEGACY_ROUTES.diary);
    expect(router.state.location.pathname).toBe('/');
  });
});

describe('нижняя навигация', () => {
  // Требование изменилось (решение №28): «Покупки» стали вкладкой кладовой, в навигации — «Профиль»
  it('четыре вкладки: Сегодня, Рецепты, Кладовая, Профиль; «Рецепты» активна и на странице рецепта', () => {
    const router = createMemoryRouter([{ path: '*', element: <BottomNav /> }], {
      initialEntries: ['/recipes/abc'],
    });
    render(<RouterProvider router={router} />);

    const links = screen.getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual([
      'Сегодня',
      'Рецепты',
      'Кладовая',
      'Профиль',
    ]);
    expect(screen.getByRole('link', { name: 'Рецепты' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Сегодня' })).not.toHaveAttribute('aria-current');
  });
});
