import { useEffect, useMemo, useRef, useState } from 'react';

import { selectCookedDishes, useCookedDishStore, type CookedDish } from '@/entities/cooked-dish';
import type { MealType } from '@/entities/meal-entry';
import { filterProducts, selectProducts, useProductStore, type Product } from '@/entities/product';
import { recipeNutrition, selectRecipes, useRecipeStore, type Recipe } from '@/entities/recipe';
import { formatAmount, formatKcal, formatPortions, type IsoDate } from '@/shared/lib';
import { Input } from '@/shared/ui';

import styles from './AddMealEntryForm.module.css';
import { DishEntryForm } from './DishEntryForm';
import { ProductEntryForm } from './ProductEntryForm';
import { RecipeEntryForm } from './RecipeEntryForm';

interface AddMealEntryFormProps {
  date: IsoDate;
  initialMealType: MealType;
  onDone: () => void;
}

type Selection =
  | { kind: 'dish'; dish: CookedDish }
  | { kind: 'recipe'; recipe: Recipe }
  | { kind: 'product'; product: Product };

/** Ключ варианта в списке — чтобы после «← Другой …» вернуться к нему. */
const optionKey = (selection: Selection) =>
  selection.kind === 'dish'
    ? `dish:${selection.dish.id}`
    : selection.kind === 'recipe'
      ? `recipe:${selection.recipe.id}`
      : `product:${selection.product.id}`;

const matches = (name: string, query: string) =>
  name.toLocaleLowerCase('ru-RU').includes(query.trim().toLocaleLowerCase('ru-RU'));

/**
 * «Добавить еду» (решение №27): приготовленные блюда, рецепты и продукты в одном поиске.
 * После выбора — своя форма для каждого источника. «← Другой …» возвращает к тому же поиску:
 * запрос сохраняется, список прокручен к выбранному варианту, фокус — на нём.
 */
export const AddMealEntryForm = ({ date, initialMealType, onDone }: AddMealEntryFormProps) => {
  const products = useProductStore(selectProducts);
  const recipes = useRecipeStore(selectRecipes);
  const dishes = useCookedDishStore(selectCookedDishes);
  const [query, setQuery] = useState('');
  const [selection, setSelection] = useState<Selection | null>(null);
  const [lastChosen, setLastChosen] = useState<string | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const available = useMemo(() => dishes.filter((dish) => dish.servingsLeft > 0), [dishes]);

  // Вернулись к выбору — показать и сфокусировать то, что было выбрано
  useEffect(() => {
    if (selection || !lastChosen) return;
    const option = Array.from(
      pickerRef.current?.querySelectorAll<HTMLButtonElement>('[data-option]') ?? [],
    ).find((button) => button.dataset.option === lastChosen);
    option?.scrollIntoView?.({ block: 'nearest' });
    option?.focus();
  }, [selection, lastChosen]);

  const choose = (next: Selection) => {
    setLastChosen(optionKey(next));
    setSelection(next);
  };

  if (selection) {
    const common = {
      date,
      initialMealType,
      onDone,
      onChangeSource: () => setSelection(null),
    };
    if (selection.kind === 'dish') return <DishEntryForm dish={selection.dish} {...common} />;
    if (selection.kind === 'recipe') {
      return <RecipeEntryForm recipe={selection.recipe} {...common} />;
    }
    return <ProductEntryForm product={selection.product} {...common} />;
  }

  const foundDishes = available.filter((dish) => matches(dish.name, query));
  const foundRecipes = recipes
    .filter((recipe) => matches(recipe.name, query))
    .sort((a, b) => a.name.localeCompare(b.name, 'ru-RU'));
  const foundProducts = filterProducts(products, query)
    .slice()
    .sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0) || a.name.localeCompare(b.name));
  const nothing = foundDishes.length + foundRecipes.length + foundProducts.length === 0;

  return (
    <div className={styles.picker} ref={pickerRef}>
      <Input
        type="search"
        placeholder="Продукт, блюдо или рецепт"
        aria-label="Найти продукт, блюдо или рецепт"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <div className={styles.options}>
        {foundDishes.length > 0 && (
          <section aria-label="Приготовленные блюда">
            <h3 className={styles.group}>Приготовленные блюда</h3>
            <ul className={styles.list}>
              {foundDishes.map((dish) => (
                <li key={dish.id}>
                  <button
                    type="button"
                    className={styles.option}
                    data-option={`dish:${dish.id}`}
                    onClick={() => choose({ kind: 'dish', dish })}
                  >
                    <span className={styles.optionName}>{dish.name}</span>
                    <span className={styles.optionMeta}>
                      осталось {formatPortions(dish.servingsLeft)} порц. ·{' '}
                      {formatKcal((dish.per100g.kcal * dish.portionGrams) / 100)} ккал/порц.
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
        {foundRecipes.length > 0 && (
          <section aria-label="Рецепты">
            <h3 className={styles.group}>Рецепты</h3>
            <ul className={styles.list}>
              {foundRecipes.map((recipe) => (
                <li key={recipe.id}>
                  <button
                    type="button"
                    className={styles.option}
                    data-option={`recipe:${recipe.id}`}
                    onClick={() => choose({ kind: 'recipe', recipe })}
                  >
                    <span className={styles.optionName}>{recipe.name}</span>
                    <span className={styles.optionMeta}>
                      {formatKcal(recipeNutrition(recipe, products).perServing.kcal)} ккал/порц.
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
        {foundProducts.length > 0 && (
          <section aria-label="Продукты">
            <h3 className={styles.group}>Продукты</h3>
            <ul className={styles.list}>
              {foundProducts.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={styles.option}
                    data-option={`product:${item.id}`}
                    onClick={() => choose({ kind: 'product', product: item })}
                  >
                    <span className={styles.optionName}>{item.name}</span>
                    <span className={styles.optionMeta}>
                      {formatKcal(item.per100g.kcal)} ккал/{item.unit === 'ml' ? '100 мл' : '100 г'}
                      {item.stock > 0 && ` · есть ${formatAmount(item.stock, item.unit)}`}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
        {nothing && (
          <p className={styles.empty}>
            Ничего не найдено — добавьте продукт в «Кладовой» или рецепт в «Рецептах»
          </p>
        )}
      </div>
    </div>
  );
};
