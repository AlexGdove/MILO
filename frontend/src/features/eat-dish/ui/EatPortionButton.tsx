import { useState } from 'react';

import { useCookedDishStore, type CookedDish } from '@/entities/cooked-dish';
import {
  buildDishEntry,
  MEAL_TYPES,
  suggestMealType,
  useMealEntryStore,
  type MealType,
} from '@/entities/meal-entry';
import { formatGrams, formatKcal, nutrientsForGrams, todayIsoDate } from '@/shared/lib';
import { Button, Modal, SegmentedControl, Stepper } from '@/shared/ui';

import styles from './EatPortionButton.module.css';

interface EatPortionButtonProps {
  dish: CookedDish;
}

interface EatFormProps {
  dish: CookedDish;
  onDone: () => void;
}

const EatForm = ({ dish, onDone }: EatFormProps) => {
  const eatPortions = useCookedDishStore((state) => state.eatPortions);
  const addEntry = useMealEntryStore((state) => state.addEntry);
  const [portions, setPortions] = useState(1);
  const [mealType, setMealType] = useState<MealType>(() => suggestMealType());

  const grams = dish.portionGrams * portions;
  const kcal = nutrientsForGrams(dish.per100g, grams).kcal;

  const handleEat = () => {
    const eaten = eatPortions(dish.id, portions);
    if (eaten > 0) addEntry(buildDishEntry(dish, eaten, todayIsoDate(), mealType));
    onDone();
  };

  return (
    <div className={styles.form}>
      <Stepper label="Порций" value={portions} max={dish.servingsLeft} onChange={setPortions} />
      <SegmentedControl
        legend="Приём пищи"
        options={MEAL_TYPES}
        value={mealType}
        onChange={setMealType}
      />
      <p className={styles.hint}>
        Запишется на «Сегодня»: {formatGrams(grams)} г · {formatKcal(kcal)} ккал
      </p>
      <Button fullWidth onClick={handleEat}>
        Записать
      </Button>
    </div>
  );
};

/** «Съесть порцию»: запись на «Сегодня» и уменьшение остатка порций блюда. */
export const EatPortionButton = ({ dish }: EatPortionButtonProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="small" onClick={() => setOpen(true)} disabled={dish.servingsLeft <= 0}>
        Съесть порцию
      </Button>
      <Modal open={open} title={dish.name} onClose={() => setOpen(false)}>
        <EatForm dish={dish} onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
};
