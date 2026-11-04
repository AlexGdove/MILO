import { MEAL_TYPES, MealEntryRow, totalNutrients, useDayEntries } from '@/entities/meal-entry';
import { AddMealEntryButton } from '@/features/add-meal-entry';
import { RemoveMealEntryButton } from '@/features/remove-meal-entry';
import { formatKcal, type IsoDate } from '@/shared/lib';
import { Card } from '@/shared/ui';

import styles from './MealList.module.css';

interface MealListProps {
  date: IsoDate;
}

export const MealList = ({ date }: MealListProps) => {
  const entries = useDayEntries(date);

  return (
    <div className={styles.list}>
      {MEAL_TYPES.map(({ value, label }) => {
        const mealEntries = entries.filter((entry) => entry.mealType === value);
        const total = totalNutrients(mealEntries);

        return (
          <Card key={value} className={styles.meal}>
            <header className={styles.header}>
              <h2 className={styles.title}>{label}</h2>
              {mealEntries.length > 0 && (
                <span className={styles.total}>{formatKcal(total.kcal)} ккал</span>
              )}
              <AddMealEntryButton date={date} mealType={value} />
            </header>
            {mealEntries.length > 0 && (
              <ul className={styles.entries}>
                {mealEntries.map((entry) => (
                  <li key={entry.id}>
                    <MealEntryRow entry={entry} actions={<RemoveMealEntryButton entry={entry} />} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        );
      })}
    </div>
  );
};
