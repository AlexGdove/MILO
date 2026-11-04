import { formatDayLabel, todayIsoDate } from '@/shared/lib';

import styles from './DateSwitcher.module.css';
import { useSelectedDateStore } from '../model/store';

export const DateSwitcher = () => {
  const date = useSelectedDateStore((state) => state.date);
  const shift = useSelectedDateStore((state) => state.shift);
  const setDate = useSelectedDateStore((state) => state.setDate);
  const isToday = date === todayIsoDate();

  return (
    <div className={styles.switcher}>
      <button
        type="button"
        className={styles.arrow}
        onClick={() => shift(-1)}
        aria-label="Предыдущий день"
      >
        ‹
      </button>
      <button
        type="button"
        className={styles.label}
        onClick={() => setDate(todayIsoDate())}
        disabled={isToday}
        title={isToday ? undefined : 'Вернуться к сегодня'}
      >
        {formatDayLabel(date)}
      </button>
      <button
        type="button"
        className={styles.arrow}
        onClick={() => shift(1)}
        aria-label="Следующий день"
      >
        ›
      </button>
    </div>
  );
};
