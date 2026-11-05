import { selectCookedDishes, useCookedDishStore } from '@/entities/cooked-dish';
import { mealTypeLabel, useMealEntryStore } from '@/entities/meal-entry';
import { cn, formatDayLabel } from '@/shared/lib';
import { EmptyState } from '@/shared/ui';

import styles from './CookingHistory.module.css';
import { buildHistory } from '../lib/buildHistory';

/** История: когда что готовили и когда ели порции блюд. */
export const CookingHistory = () => {
  const dishes = useCookedDishStore(selectCookedDishes);
  const entries = useMealEntryStore((state) => state.entries);
  const days = buildHistory(dishes, entries);

  if (days.length === 0) {
    return (
      <EmptyState
        title="История пуста"
        description="Здесь будет журнал готовки и съеденного по дням"
      />
    );
  }

  return (
    <section className={styles.root} aria-label="История готовки">
      {days.map((day) => (
        <div key={day.date} className={styles.day}>
          <h3 className={styles.date}>{formatDayLabel(day.date)}</h3>
          <ul className={styles.list}>
            {day.events.map((event) => (
              <li key={`${event.kind}-${event.id}`} className={styles.event}>
                <span
                  className={cn(
                    styles.marker,
                    event.kind === 'cooked' ? styles.cooked : styles.eaten,
                  )}
                  aria-hidden="true"
                />
                <span className={styles.text}>
                  {event.kind === 'cooked'
                    ? `Приготовлено: ${event.name}, ${event.portions} порц.`
                    : `Съедено: ${event.name}, ${event.portions} порц. · ${mealTypeLabel(event.mealType)}`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
};
