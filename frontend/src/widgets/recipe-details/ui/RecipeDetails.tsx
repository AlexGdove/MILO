import { useState } from 'react';

import { selectProducts, useProductStore } from '@/entities/product';
import {
  AVAILABILITY_LABEL,
  checkAvailability,
  recipeNutrition,
  type IngredientAvailability,
  type Recipe,
} from '@/entities/recipe';
import { cn, formatAmount, formatGrams, formatKcal } from '@/shared/lib';
import { Button, Card } from '@/shared/ui';

import styles from './RecipeDetails.module.css';

const MAX_SERVINGS = 50;

const ingredientNote = (item: IngredientAvailability): string => {
  if (item.productMissing) return 'продукт удалён из кладовой';
  if (item.unitChanged) return 'у продукта сменилась единица — измените рецепт';
  if (item.status === 'enough') return `есть ${formatAmount(item.available, item.unit)}`;
  if (item.status === 'partial') {
    return `есть ${formatAmount(item.available, item.unit)}, не хватает ${formatAmount(item.shortage, item.unit)}`;
  }
  return 'нет в кладовой';
};

const STATUS_TEXT = { enough: 'Хватает', partial: 'Частично', missing: 'Нет' } as const;

interface RecipeDetailsProps {
  recipe: Recipe;
}

/** Рецепт: выбор порций, наличие каждого ингредиента в кладовой и КБЖУ. */
export const RecipeDetails = ({ recipe }: RecipeDetailsProps) => {
  const products = useProductStore(selectProducts);
  const [servings, setServings] = useState(recipe.servings);

  const availability = checkAvailability(recipe, products, servings);
  const nutrition = recipeNutrition(recipe, products);
  const { perServing } = nutrition;

  return (
    <div className={styles.root}>
      <Card className={styles.servings}>
        <span className={styles.servingsLabel}>Порций</span>
        <div className={styles.stepper}>
          <Button
            variant="secondary"
            size="small"
            onClick={() => setServings((n) => Math.max(1, n - 1))}
            disabled={servings <= 1}
            aria-label="Меньше порций"
          >
            −
          </Button>
          <output className={styles.servingsValue} aria-live="polite" aria-label="Порций">
            {servings}
          </output>
          <Button
            variant="secondary"
            size="small"
            onClick={() => setServings((n) => Math.min(MAX_SERVINGS, n + 1))}
            disabled={servings >= MAX_SERVINGS}
            aria-label="Больше порций"
          >
            +
          </Button>
        </div>
      </Card>

      <section className={styles.section} aria-labelledby="recipe-ingredients">
        <div className={styles.sectionHead}>
          <h2 id="recipe-ingredients" className={styles.heading}>
            Ингредиенты
          </h2>
          <span className={cn(styles.badge, styles[availability.status])}>
            {AVAILABILITY_LABEL[availability.status]}
          </span>
        </div>
        <ul className={styles.list}>
          {availability.items.map((item) => (
            <li key={item.productId} className={styles.ingredient}>
              <span className={cn(styles.dot, styles[item.status])} aria-hidden="true" />
              <div className={styles.ingredientInfo}>
                <span className={styles.ingredientName}>
                  {item.name || 'Удалённый продукт'} — {formatAmount(item.required, item.unit)}
                </span>
                <span className={styles.ingredientNote}>{ingredientNote(item)}</span>
              </div>
              <span className={cn(styles.status, styles[`${item.status}Text`])}>
                {STATUS_TEXT[item.status]}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <Card className={styles.nutrition}>
        <h2 className={styles.heading}>На порцию</h2>
        <p className={styles.kcal}>
          <span className={styles.kcalValue}>{formatKcal(perServing.kcal)}</span> ккал
        </p>
        <p className={styles.macros}>
          Б {formatGrams(perServing.protein)} · Ж {formatGrams(perServing.fat)} · У{' '}
          {formatGrams(perServing.carbs)}
        </p>
        <p className={styles.hint}>
          Весь рецепт ({recipe.servings} порц.): {formatKcal(nutrition.total.kcal)} ккал,{' '}
          {formatGrams(nutrition.totalGrams)} г
        </p>
        {nutrition.uncountedIngredients > 0 && (
          <p className={styles.warning}>
            Не учтено ингредиентов: {nutrition.uncountedIngredients} (удалены или сменилась единица)
          </p>
        )}
      </Card>
    </div>
  );
};
