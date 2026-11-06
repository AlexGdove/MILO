import { useState, type FormEvent } from 'react';

import { useCookedDishStore, type CookedDish } from '@/entities/cooked-dish';
import {
  buildDishEntry,
  MEAL_TYPES,
  useMealEntryStore,
  type MealType,
} from '@/entities/meal-entry';
import {
  formatGrams,
  formatKcal,
  formatPortions,
  nutrientsForGrams,
  parseNumber,
  roundPortions,
  type IsoDate,
} from '@/shared/lib';
import { Button, Input, SegmentedControl, Stepper } from '@/shared/ui';

import styles from './AddMealEntryForm.module.css';
import { SelectedSource } from './SelectedSource';

type AmountMode = 'portions' | 'grams';

const AMOUNT_MODES: ReadonlyArray<{ value: AmountMode; label: string }> = [
  { value: 'portions', label: 'Порции' },
  { value: 'grams', label: 'Граммы' },
];

interface DishEntryFormProps {
  dish: CookedDish;
  date: IsoDate;
  initialMealType: MealType;
  onChangeSource: () => void;
  onDone: () => void;
}

/**
 * Приготовленное блюдо: количество в порциях или в граммах. Съеденное списывается
 * с остатка блюда (в граммах — дробной частью порции) и вернётся при удалении записи.
 */
export const DishEntryForm = ({
  dish,
  date,
  initialMealType,
  onChangeSource,
  onDone,
}: DishEntryFormProps) => {
  const eatPortions = useCookedDishStore((state) => state.eatPortions);
  const addEntry = useMealEntryStore((state) => state.addEntry);

  // Целых порций может не остаться (доели часть в граммах) — тогда только граммы
  const wholePortionsLeft = Math.floor(dish.servingsLeft);
  const leftGrams = Math.round(dish.servingsLeft * dish.portionGrams);
  const [mode, setMode] = useState<AmountMode>(wholePortionsLeft >= 1 ? 'portions' : 'grams');
  const [portions, setPortions] = useState(1);
  const [gramsInput, setGramsInput] = useState(
    String(Math.min(Math.round(dish.portionGrams), leftGrams)),
  );
  const [mealType, setMealType] = useState<MealType>(initialMealType);

  const typedGrams = parseNumber(gramsInput);
  const gramsError =
    typedGrams === null || typedGrams <= 0
      ? 'Введите вес больше 0'
      : typedGrams > leftGrams
        ? `Осталось ${formatGrams(leftGrams)} г`
        : undefined;
  const isValid = mode === 'portions' || gramsError === undefined;
  const grams = mode === 'portions' ? dish.portionGrams * portions : (typedGrams ?? 0);
  const preview = nutrientsForGrams(dish.per100g, isValid ? grams : 0);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!isValid) return;

    if (mode === 'portions') {
      const eaten = eatPortions(dish.id, portions);
      if (eaten > 0) addEntry(buildDishEntry(dish, eaten, date, mealType));
    } else {
      // Ввели весь остаток — доедаем блюдо целиком, без «хвоста» в доли грамма
      const wanted = grams >= leftGrams ? dish.servingsLeft : grams / dish.portionGrams;
      const eaten = eatPortions(dish.id, wanted);
      if (eaten > 0) {
        // Записываем введённый вес; меньше — только если остаток оказался меньше запроса
        const exact = eaten < roundPortions(wanted) ? dish.portionGrams * eaten : grams;
        addEntry(buildDishEntry(dish, eaten, date, mealType, exact));
      }
    }
    onDone();
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <SelectedSource
        name={dish.name}
        meta={`Порция ${formatGrams(dish.portionGrams)} г · осталось ${formatPortions(dish.servingsLeft)} порц. (${formatGrams(leftGrams)} г)`}
        changeLabel="← Другое блюдо"
        onChange={onChangeSource}
      />

      {wholePortionsLeft >= 1 && (
        <SegmentedControl legend="Сколько" options={AMOUNT_MODES} value={mode} onChange={setMode} />
      )}

      {mode === 'portions' ? (
        <Stepper label="Порций" value={portions} max={wholePortionsLeft} onChange={setPortions} />
      ) : (
        <Input
          label="Вес, г"
          inputMode="decimal"
          value={gramsInput}
          onChange={(event) => setGramsInput(event.target.value)}
          error={gramsError}
        />
      )}

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
      <Button type="submit" fullWidth disabled={!isValid}>
        Добавить
      </Button>
    </form>
  );
};
