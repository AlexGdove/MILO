import { useState } from 'react';

import { selectProducts, useProductStore } from '@/entities/product';
import {
  checkAvailability,
  RecipeCard,
  recipeNutrition,
  selectRecipes,
  useRecipeStore,
} from '@/entities/recipe';
import { AddRecipeButton } from '@/features/manage-recipe';
import { recipePath } from '@/shared/config';
import { EmptyState, Input } from '@/shared/ui';

import styles from './RecipeList.module.css';

/** Все рецепты: поиск по названию, у каждого — калории на порцию и наличие продуктов. */
export const RecipeList = () => {
  const recipes = useRecipeStore(selectRecipes);
  const products = useProductStore(selectProducts);
  const [query, setQuery] = useState('');

  const normalized = query.trim().toLocaleLowerCase('ru-RU');
  const visible = recipes
    .filter((recipe) => recipe.name.toLocaleLowerCase('ru-RU').includes(normalized))
    .sort((a, b) => a.name.localeCompare(b.name, 'ru-RU'));

  if (recipes.length === 0) {
    return (
      <EmptyState
        title="Рецептов пока нет"
        description="Соберите рецепт из продуктов кладовой — MILO покажет, хватает ли всего, и посчитает КБЖУ порции"
        action={<AddRecipeButton label="Создать рецепт" />}
      />
    );
  }

  return (
    <section className={styles.section}>
      <Input
        type="search"
        placeholder="Поиск рецепта"
        aria-label="Поиск рецепта"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {visible.length === 0 ? (
        <EmptyState title="Ничего не найдено" description="Попробуйте изменить запрос" />
      ) : (
        <ul className={styles.list}>
          {visible.map((recipe) => (
            <li key={recipe.id}>
              <RecipeCard
                recipe={recipe}
                to={recipePath(recipe.id)}
                kcalPerServing={recipeNutrition(recipe, products).perServing.kcal}
                availability={checkAvailability(recipe, products).status}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
