import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { createId, persistStorage, storageKey } from '@/shared/lib';

import { migrateRecipes, RECIPES_STORAGE_VERSION } from './migrations';
import type { Recipe, RecipeDraft } from './types';

interface RecipeState {
  recipes: Recipe[];
  addRecipe: (draft: RecipeDraft) => Recipe;
  updateRecipe: (id: string, draft: RecipeDraft) => void;
  removeRecipe: (id: string) => void;
}

export const useRecipeStore = create<RecipeState>()(
  persist(
    (set) => ({
      recipes: [],

      addRecipe: (draft) => {
        const recipe: Recipe = { ...draft, id: createId(), createdAt: Date.now() };
        set((state) => ({ recipes: [recipe, ...state.recipes] }));
        return recipe;
      },

      updateRecipe: (id, draft) =>
        set((state) => ({
          recipes: state.recipes.map((recipe) =>
            recipe.id === id ? { ...recipe, ...draft } : recipe,
          ),
        })),

      removeRecipe: (id) =>
        set((state) => ({ recipes: state.recipes.filter((recipe) => recipe.id !== id) })),
    }),
    {
      name: storageKey('recipes'),
      storage: persistStorage,
      version: RECIPES_STORAGE_VERSION,
      migrate: migrateRecipes,
      partialize: (state) => ({ recipes: state.recipes }),
    },
  ),
);

export const selectRecipes = (state: RecipeState) => state.recipes;

export const selectRecipeById = (id: string | undefined) => (state: RecipeState) =>
  id ? state.recipes.find((recipe) => recipe.id === id) : undefined;
