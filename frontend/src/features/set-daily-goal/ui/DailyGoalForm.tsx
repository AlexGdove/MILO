import { useState, type FormEvent } from 'react';

import { DEFAULT_GOAL, useUserGoalStore, type DailyGoal } from '@/entities/user-goal';
import { parseNumber } from '@/shared/lib';
import { Button, Input } from '@/shared/ui';

import styles from './DailyGoalForm.module.css';

const FIELDS: Array<{ name: keyof DailyGoal; label: string }> = [
  { name: 'kcal', label: 'Калории, ккал' },
  { name: 'protein', label: 'Белки, г' },
  { name: 'fat', label: 'Жиры, г' },
  { name: 'carbs', label: 'Углеводы, г' },
];

type FormValues = Record<keyof DailyGoal, string>;

const toValues = (goal: DailyGoal): FormValues => ({
  kcal: String(goal.kcal),
  protein: String(goal.protein),
  fat: String(goal.fat),
  carbs: String(goal.carbs),
});

export const DailyGoalForm = () => {
  const goal = useUserGoalStore((state) => state.goal);
  const setGoal = useUserGoalStore((state) => state.setGoal);
  const [values, setValues] = useState<FormValues>(() => toValues(goal));
  const [saved, setSaved] = useState(false);

  const parsed = Object.fromEntries(
    FIELDS.map(({ name }) => [name, parseNumber(values[name])]),
  ) as Record<keyof DailyGoal, number | null>;
  const isValid = FIELDS.every(({ name }) => {
    const value = parsed[name];
    return value !== null && value >= 0;
  });
  /** Калории из БЖУ: 4 ккал/г белка и углеводов, 9 ккал/г жира. */
  const macrosKcal = (parsed.protein ?? 0) * 4 + (parsed.fat ?? 0) * 9 + (parsed.carbs ?? 0) * 4;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!isValid) return;
    setGoal({
      kcal: parsed.kcal ?? 0,
      protein: parsed.protein ?? 0,
      fat: parsed.fat ?? 0,
      carbs: parsed.carbs ?? 0,
    });
    setSaved(true);
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.grid}>
        {FIELDS.map(({ name, label }) => (
          <Input
            key={name}
            label={label}
            inputMode="decimal"
            value={values[name]}
            onChange={(event) => {
              setSaved(false);
              setValues((prev) => ({ ...prev, [name]: event.target.value }));
            }}
            error={parsed[name] === null || (parsed[name] ?? 0) < 0 ? 'Число ≥ 0' : undefined}
          />
        ))}
      </div>
      <p className={styles.hint}>По БЖУ получается ≈ {Math.round(macrosKcal)} ккал</p>
      <Button type="submit" fullWidth disabled={!isValid}>
        {saved ? 'Сохранено ✓' : 'Сохранить цель'}
      </Button>
      <Button
        variant="ghost"
        fullWidth
        onClick={() => {
          setSaved(false);
          setValues(toValues(DEFAULT_GOAL));
        }}
      >
        Сбросить по умолчанию
      </Button>
    </form>
  );
};
