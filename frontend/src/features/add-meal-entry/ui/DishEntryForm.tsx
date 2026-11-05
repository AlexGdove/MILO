import { useState, type FormEvent } from 'react';

import { useCookedDishStore, type CookedDish } from '@/entities/cooked-dish';
import {
  buildDishEntry,
  MEAL_TYPES,
  useMealEntryStore,
  type MealType,
} from '@/entities/meal-entry';
import { formatGrams, formatKcal, nutrientsForGrams, type IsoDate } from '@/shared/lib';
import { Button, SegmentedControl, Stepper } from '@/shared/ui';

import styles from './AddMealEntryForm.module.css';
import { SelectedSource } from './SelectedSource';

interface DishEntryFormProps {
  dish: CookedDish;
  date: IsoDate;
  initialMealType: MealType;
  onChangeSource: () => void;
  onDone: () => void;
}

/** Порции приготовленного блюда: списываются с блюда, вернутся при удалении записи. */
export const DishEntryForm = ({
  dish,
  date,
  initialMealType,
  onChangeSource,
  onDone,
}: DishEntryFormProps) => {
  const eatPortions = useCookedDishStore((state) => state.eatPortions);
  const addEntry = useMealEntryStore((state) => state.addEntry);
  const [portions, setPortions] = useState(1);
  const [mealType, setMealType] = useState<MealType>(initialMealType);

  const preview = nutrientsForGrams(dish.per100g, dish.portionGrams * portions);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const eaten = eatPortions(dish.id, portions);
    if (eaten > 0) addEntry(buildDishEntry(dish, eaten, date, mealType));
    onDone();
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <SelectedSource
        name={dish.name}
        meta={`Порция ${formatGrams(dish.portionGrams)} г · осталось ${dish.servingsLeft} порц.`}
        onChange={onChangeSource}
      />
      <Stepper label="Порций" value={portions} max={dish.servingsLeft} onChange={setPortions} />
      <SegmentedControl
        legend="Приём пищи"
        options={MEAL_TYPES}
        value={mealType}
        onChange={setMealType}
      />
      <p className={styles.preview}>
        <strong>{formatKcal(preview.kcal)} ккал</strong> · Б {formatGrams(preview.protein)} · Ж{' '}
        {formatGrams(preview.fat)} · У {formatGrams(preview.carbs)}
      </p>
      <Button type="submit" fullWidth>
        Добавить
      </Button>
    </form>
  );
};
