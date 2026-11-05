import { Link } from 'react-router-dom';

import { totalNutrients, useDayEntries } from '@/entities/meal-entry';
import { useDailyGoal } from '@/entities/user-goal';
import { ROUTES } from '@/shared/config';
import { cn, todayIsoDate } from '@/shared/lib';
import { ProgressRing } from '@/shared/ui';

import styles from './AppHeader.module.css';

/** Целые ккал с разделителем разрядов: 1 240. */
const kcalText = (value: number) => Math.round(value).toLocaleString('ru-RU');

/** «Съедено / норма» за сегодня (решение №29); нажатие — на «Сегодня». */
export const KcalCounter = () => {
  const entries = useDayEntries(todayIsoDate());
  const goal = useDailyGoal();
  const eaten = totalNutrients(entries).kcal;
  const progress = goal.kcal > 0 ? eaten / goal.kcal : 0;
  const over = progress > 1;

  return (
    <Link
      to={ROUTES.dashboard}
      className={cn(styles.counter, over && styles.counterOver)}
      aria-label={`Сегодня съедено ${kcalText(eaten)} из ${kcalText(goal.kcal)} ккал`}
    >
      <ProgressRing progress={progress} size={20} strokeWidth={3} />
      <span className={styles.counterText} aria-hidden="true">
        <span className={styles.counterValue}>{kcalText(eaten)}</span> / {kcalText(goal.kcal)} ккал
      </span>
    </Link>
  );
};
