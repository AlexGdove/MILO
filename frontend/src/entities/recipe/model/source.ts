import { useRecipeStore } from './store';
import type { Recipe } from './types';

/**
 * Источник рецептов (решение №6). Сейчас один — локальный; внешний API и общая база
 * подключаются новыми реализациями, экраны и логика готовки от этого не меняются.
 */
export interface RecipeSource {
  id: string;
  label: string;
  list: () => Promise<Recipe[]>;
  get: (id: string) => Promise<Recipe | undefined>;
}

export const localRecipeSource: RecipeSource = {
  id: 'local',
  label: 'Мои рецепты',
  list: async () => useRecipeStore.getState().recipes,
  get: async (id) => useRecipeStore.getState().recipes.find((recipe) => recipe.id === id),
};
