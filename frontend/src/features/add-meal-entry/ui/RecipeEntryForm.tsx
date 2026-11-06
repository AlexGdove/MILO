import { useState, type FormEvent } from 'react';

import { useCookedDishStore } from '@/entities/cooked-dish';
import {
  buildDishEntry,
  MEAL_TYPES,
  useMealEntryStore,
  type MealType,
} from '@/entities/meal-entry';
import { selectProducts, useProductStore } from '@/entities/product';
import {
  checkAvailability,
  planCooking,
  recipeNutrition,
  type Recipe,
  type ShortageDecision,
} from '@/entities/recipe';
import {
  formatGrams,
  formatKcal,
  nutrientsForGrams,
  type IsoDate,
  type Nutrients,
} from '@/shared/lib';
import { Button, SegmentedControl, Stepper } from '@/shared/ui';

import styles from './AddMealEntryForm.module.css';
import { SelectedSource } from './SelectedSource';

const MAX_PORTIONS = 20;

/** КБЖУ на 100 г по сумме КБЖУ и общему весу. */
const per100gOf = (total: Nutrients, grams: number): Nutrients => {
  const factor = grams > 0 ? 100 / grams : 0;
  return {
    kcal: total.kcal * factor,
    protein: total.protein * factor,
    fat: total.fat * factor,
    carbs: total.carbs * factor,
  };
};

interface RecipeEntryFormProps {
  recipe: Recipe;
  date: IsoDate;
  initialMealType: MealType;
  onChangeSource: () => void;
  onDone: () => void;
}

/**
 * Порции рецепта (решение №27). Со списанием — продукты на эти порции списываются из кладовой
 * (сколько есть), блюдо попадает в историю как приготовленное и съеденное. Без списания — только КБЖУ.
 */
export const RecipeEntryForm = ({
  recipe,
  date,
  initialMealType,
  onChangeSource,
  onDone,
}: RecipeEntryFormProps) => {
  const products = useProductStore(selectProducts);
  const adjustStock = useProductStore((state) => state.adjustStock);
  const addDish = useCookedDishStore((state) => state.addDish);
  const eatPortions = useCookedDishStore((state) => state.eatPortions);
  const addEntry = useMealEntryStore((state) => state.addEntry);

  const [portions, setPortions] = useState(1);
  const [mealType, setMealType] = useState<MealType>(initialMealType);

  const availability = checkAvailability(recipe, products, portions);
  const anyAvailable = availability.items.some((item) => item.available > 0);
  const [deduct, setDeduct] = useState(anyAvailable);
  const willDeduct = deduct && anyAvailable;

  // Нехватки не добавляем в покупки — готовим из того, что есть
  const skipAll = Object.fromEntries(
    availability.items.map((item): [string, ShortageDecision] => [item.productId, 'skip']),
  );
  const plan = planCooking(availability, products, skipAll);
  const nominal = recipeNutrition(recipe, products);

  // КБЖУ: при списании — по фактически использованному, иначе — по рецепту
  const fromPlan = willDeduct && plan.totalGrams > 0;
  const portionGrams = fromPlan ? plan.totalGrams / portions : nominal.totalGrams / recipe.servings;
  const per100g = fromPlan ? plan.per100g : per100gOf(nominal.total, nominal.totalGrams);
  const preview = nutrientsForGrams(per100g, portionGrams * portions);
  const canSubmit = portionGrams > 0;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    if (willDeduct) {
      for (const { productId, amount } of plan.deductions) adjustStock(productId, -amount);
      const dish = addDish({
        recipeId: recipe.id,
        name: recipe.name,
        servingsTotal: portions,
        portionGrams,
        per100g,
      });
      const eaten = eatPortions(dish.id, portions);
      addEntry(buildDishEntry(dish, eaten, date, mealType));
    } else {
      const grams = portionGrams * portions;
      addEntry({
        date,
        mealType,
        // Без готовки: источник — рецепт, ничего не списано и не вернётся при удалении
        source: { type: 'recipe', id: recipe.id },
        productName: recipe.name,
        per100g,
        amount: Math.round(grams),
        unit: 'g',
        grams,
        stockDeducted: 0,
      });
    }
    onDone();
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <SelectedSource
        name={recipe.name}
        meta={`Рецепт на ${recipe.servings} порц. · ${formatKcal(nominal.perServing.kcal)} ккал/порц.`}
        changeLabel="← Другой рецепт"
        onChange={onChangeSource}
      />
      <Stepper label="Порций" value={portions} max={MAX_PORTIONS} onChange={setPortions} />
      <SegmentedControl
        legend="Приём пищи"
        options={MEAL_TYPES}
        value={mealType}
        onChange={setMealType}
      />

      {anyAvailable ? (
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={deduct}
            onChange={(event) => setDeduct(event.target.checked)}
          />
          Списать продукты из кладовой
          {availability.status !== 'enough' && ' (хватает не всего — спишется то, что есть)'}
        </label>
      ) : (
        <p className={styles.note}>
          В кладовой нет продуктов этого рецепта — запишется только КБЖУ.
        </p>
      )}

      {canSubmit ? (
        <p className={styles.preview}>
          <strong>{formatKcal(preview.kcal)} ккал</strong> · Б {formatGrams(preview.protein)} · Ж{' '}
          {formatGrams(preview.fat)} · У {formatGrams(preview.carbs)}
        </p>
      ) : (
        <p className={styles.note}>
          КБЖУ не посчитать: продукты рецепта удалены из кладовой. Измените рецепт.
        </p>
      )}

      <Button type="submit" fullWidth disabled={!canSubmit}>
        Добавить
      </Button>
    </form>
  );
};
