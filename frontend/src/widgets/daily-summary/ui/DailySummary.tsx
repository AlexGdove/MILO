import { totalNutrients, useDayEntries } from '@/entities/meal-entry';
import { useDailyGoal } from '@/entities/user-goal';
import { formatGrams, formatKcal, type IsoDate } from '@/shared/lib';
import { Card, ProgressRing } from '@/shared/ui';

import styles from './DailySummary.module.css';

interface DailySummaryProps {
  date: IsoDate;
}

const MACROS = [
  { key: 'protein', label: 'Белки', color: 'var(--color-macro-protein)' },
  { key: 'fat', label: 'Жиры', color: 'var(--color-macro-fat)' },
  { key: 'carbs', label: 'Углеводы', color: 'var(--color-macro-carbs)' },
] as const;

const ratio = (value: number, goal: number) => (goal > 0 ? value / goal : 0);

export const DailySummary = ({ date }: DailySummaryProps) => {
  const entries = useDayEntries(date);
  const goal = useDailyGoal();
  const eaten = totalNutrients(entries);
  const remaining = goal.kcal - eaten.kcal;

  return (
    <Card className={styles.card}>
      <div className={styles.ringRow}>
        <div className={styles.side}>
          <span className={styles.sideValue}>{formatKcal(eaten.kcal)}</span>
          <span className={styles.sideLabel}>съедено</span>
        </div>
        <ProgressRing progress={ratio(eaten.kcal, goal.kcal)}>
          <span className={remaining < 0 ? styles.over : styles.remaining}>
            {formatKcal(Math.abs(remaining))}
          </span>
          <span className={styles.sideLabel}>{remaining < 0 ? 'ккал сверх' : 'ккал осталось'}</span>
        </ProgressRing>
        <div className={styles.side}>
          <span className={styles.sideValue}>{formatKcal(goal.kcal)}</span>
          <span className={styles.sideLabel}>цель</span>
        </div>
      </div>

      <div className={styles.macros}>
        {MACROS.map(({ key, label, color }) => {
          const value = eaten[key];
          const progress = Math.min(ratio(value, goal[key]), 1);
          return (
            <div key={key} className={styles.macro}>
              <span className={styles.macroLabel}>{label}</span>
              <div
                className={styles.bar}
                role="progressbar"
                aria-label={label}
                aria-valuemin={0}
                aria-valuemax={goal[key]}
                aria-valuenow={Math.round(value)}
              >
                <div
                  className={styles.barFill}
                  style={{ width: `${progress * 100}%`, background: color }}
                />
              </div>
              <span className={styles.macroValue}>
                {formatGrams(value)} / {formatGrams(goal[key])} г
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
