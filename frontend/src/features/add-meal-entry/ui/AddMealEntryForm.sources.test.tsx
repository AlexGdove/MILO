import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCookedDishStore } from '@/entities/cooked-dish';
import { useMealEntryStore } from '@/entities/meal-entry';
import { selectProductById, useProductStore } from '@/entities/product';
import { useRecipeStore } from '@/entities/recipe';

import { AddMealEntryForm } from './AddMealEntryForm';

const DATE = '2026-11-05';
const SEARCH = { name: 'Найти продукт, блюдо или рецепт' };

const products = () => useProductStore.getState();
const entries = () => useMealEntryStore.getState().entries;
const dishes = () => useCookedDishStore.getState().dishes;

/** Рецепт «Омлет» на 2 порции: 4 яйца (по 50 г) + 100 мл молока. Дома 2 яйца и 1 л молока. */
const setupOmelet = () => {
  const eggs = products().addProduct({
    name: 'Яйца',
    per100g: { kcal: 150, protein: 12, fat: 10, carbs: 1 },
    unit: 'pcs',
    pieceWeight: 50,
    stock: 2,
    minStock: 0,
  });
  const milk = products().addProduct({
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
  return { eggs, milk, recipe };
};

const renderForm = () => {
  const onDone = vi.fn();
  render(<AddMealEntryForm date={DATE} initialMealType="dinner" onDone={onDone} />);
  return { user: userEvent.setup(), onDone };
};

const stockOf = (id: string) => selectProductById(id)(products())?.stock;

beforeEach(() => {
  useProductStore.setState({ products: [] });
  useRecipeStore.setState(useRecipeStore.getInitialState(), true);
  useCookedDishStore.setState(useCookedDishStore.getInitialState(), true);
  useMealEntryStore.setState(useMealEntryStore.getInitialState(), true);
});

describe('AddMealEntryForm: блюда и рецепты', () => {
  it('у блюда и рецепта своя подпись возврата; возврат — к тому же варианту', async () => {
    setupOmelet();
    useCookedDishStore.getState().addDish({
      recipeId: 'r',
      name: 'Суп',
      servingsTotal: 4,
      portionGrams: 300,
      per100g: { kcal: 40, protein: 2, fat: 1, carbs: 5 },
    });
    const { user } = renderForm();

    await user.click(screen.getByRole('button', { name: /Суп/ }));
    await user.click(screen.getByRole('button', { name: '← Другое блюдо' }));
    expect(screen.getByRole('button', { name: /Суп/ })).toHaveFocus();

    await user.click(screen.getByRole('button', { name: /Омлет/ }));
    await user.click(screen.getByRole('button', { name: '← Другой рецепт' }));
    expect(screen.getByRole('button', { name: /Омлет/ })).toHaveFocus();
    expect(entries()).toHaveLength(0);
  });

  it('показывает группы: приготовленные блюда, рецепты, продукты', () => {
    setupOmelet();
    useCookedDishStore.getState().addDish({
      recipeId: 'r',
      name: 'Суп',
      servingsTotal: 4,
      portionGrams: 300,
      per100g: { kcal: 40, protein: 2, fat: 1, carbs: 5 },
    });
    renderForm();

    expect(
      within(screen.getByRole('region', { name: 'Приготовленные блюда' })).getByText('Суп'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Рецепты' })).getByText('Омлет'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Продукты' })).getByText('Яйца'),
    ).toBeInTheDocument();
  });

  it('порции приготовленного блюда списываются с блюда', async () => {
    const dish = useCookedDishStore.getState().addDish({
      recipeId: 'r',
      name: 'Суп',
      servingsTotal: 4,
      portionGrams: 300,
      per100g: { kcal: 40, protein: 2, fat: 1, carbs: 5 },
    });
    const { user, onDone } = renderForm();

    await user.click(screen.getByRole('button', { name: /Суп/ }));
    await user.click(screen.getByRole('button', { name: 'Порций: больше' }));
    expect(screen.getByText('240 ккал')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Добавить' }));

    expect(dishes()[0]?.servingsLeft).toBe(2);
    expect(entries()[0]).toMatchObject({
      date: DATE,
      mealType: 'dinner',
      source: { type: 'recipe', id: dish.id },
      grams: 600,
      stockDeducted: 2,
    });
    expect(onDone).toHaveBeenCalled();
  });

  describe('приготовленное блюдо в граммах', () => {
    const addSoup = (servingsTotal = 4) =>
      useCookedDishStore.getState().addDish({
        recipeId: 'r',
        name: 'Суп',
        servingsTotal,
        portionGrams: 300,
        per100g: { kcal: 40, protein: 2, fat: 1, carbs: 5 },
      });

    const chooseGrams = async (user: ReturnType<typeof userEvent.setup>) => {
      await user.click(screen.getByRole('button', { name: /Суп/ }));
      await user.click(screen.getByRole('radio', { name: 'Граммы' }));
    };

    it('150 г при порции 300 г — списывается полпорции, в записи ровно 150 г', async () => {
      const dish = addSoup();
      const { user } = renderForm();
      await chooseGrams(user);
      const weight = screen.getByRole('textbox', { name: 'Вес, г' });
      await user.clear(weight);
      await user.type(weight, '150');
      expect(screen.getByText('60 ккал')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Добавить' }));

      expect(dishes()[0]?.servingsLeft).toBe(3.5);
      expect(entries()[0]).toMatchObject({
        source: { type: 'recipe', id: dish.id },
        grams: 150,
        amount: 150,
        stockDeducted: 0.5,
      });
    });

    it('больше остатка ввести нельзя', async () => {
      addSoup(1);
      const { user } = renderForm();
      await chooseGrams(user);
      const weight = screen.getByRole('textbox', { name: 'Вес, г' });
      await user.clear(weight);
      await user.type(weight, '301');

      expect(screen.getByText('Осталось 300 г')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Добавить' })).toBeDisabled();
      expect(entries()).toEqual([]);
    });

    it('весь остаток в граммах — блюдо доедено полностью', async () => {
      addSoup(1);
      const { user } = renderForm();
      await chooseGrams(user);
      const weight = screen.getByRole('textbox', { name: 'Вес, г' });
      await user.clear(weight);
      await user.type(weight, '300');
      await user.click(screen.getByRole('button', { name: 'Добавить' }));

      expect(dishes()[0]?.servingsLeft).toBe(0);
      expect(entries()[0]).toMatchObject({ grams: 300, stockDeducted: 1 });
    });

    it('если целой порции не осталось — сразу граммы, без выбора порций', async () => {
      const dish = addSoup(1);
      useCookedDishStore.getState().eatPortions(dish.id, 0.5);
      const { user } = renderForm();
      await user.click(screen.getByRole('button', { name: /Суп/ }));

      expect(screen.queryByRole('radio', { name: 'Порции' })).not.toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'Вес, г' })).toHaveValue('150');
    });
  });

  it('рецепт со списанием: продукты на порцию уходят из кладовой, блюдо — в историю', async () => {
    const { eggs, milk, recipe } = setupOmelet();
    const { user } = renderForm();

    await user.type(screen.getByRole('searchbox', SEARCH), 'омл');
    await user.click(screen.getByRole('button', { name: /Омлет/ }));
    // 1 порция = 2 яйца + 50 мл — всё есть
    expect(screen.getByRole('checkbox', { name: /Списать продукты/ })).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Добавить' }));

    expect(stockOf(eggs.id)).toBe(0);
    expect(stockOf(milk.id)).toBe(950);
    expect(dishes()).toMatchObject([{ recipeId: recipe.id, servingsTotal: 1, servingsLeft: 0 }]);
    // 2 яйца (100 г, 150 ккал) + 50 мл (25 ккал) = 150 г, 175 ккал
    expect(entries()[0]).toMatchObject({
      source: { id: dishes()[0]?.id },
      grams: 150,
      stockDeducted: 1,
    });
    expect(entries()[0]?.per100g.kcal).toBeCloseTo((175 / 150) * 100);
  });

  it('рецепт без списания: только КБЖУ по рецепту, кладовая не меняется', async () => {
    const { eggs, milk, recipe } = setupOmelet();
    const { user } = renderForm();

    await user.click(screen.getByRole('button', { name: /Омлет/ }));
    await user.click(screen.getByRole('checkbox', { name: /Списать продукты/ }));
    await user.click(screen.getByRole('button', { name: 'Добавить' }));

    expect(stockOf(eggs.id)).toBe(2);
    expect(stockOf(milk.id)).toBe(1000);
    expect(dishes()).toEqual([]);
    // Порция по рецепту: (4×50 г + 100 мл) / 2 = 150 г; (300 + 50) / 2 = 175 ккал
    expect(entries()[0]).toMatchObject({
      source: { type: 'recipe', id: recipe.id },
      grams: 150,
      stockDeducted: 0,
    });
    expect(entries()[0]?.per100g.kcal).toBeCloseTo((175 / 150) * 100);
  });

  it('если продуктов не хватает — списывается то, что есть', async () => {
    const { eggs, milk } = setupOmelet();
    const { user } = renderForm();

    await user.click(screen.getByRole('button', { name: /Омлет/ }));
    await user.click(screen.getByRole('button', { name: 'Порций: больше' }));
    expect(screen.getByRole('checkbox', { name: /спишется то, что есть/ })).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Добавить' }));

    // на 2 порции нужно 4 яйца — есть 2
    expect(stockOf(eggs.id)).toBe(0);
    expect(stockOf(milk.id)).toBe(900);
    expect(dishes()[0]).toMatchObject({ servingsTotal: 2, servingsLeft: 0 });
  });
});
