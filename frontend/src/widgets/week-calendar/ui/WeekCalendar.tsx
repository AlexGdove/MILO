import { useMemo, useRef, type TouchEvent } from 'react';

import { totalNutrients, useMealEntryStore } from '@/entities/meal-entry';
import { useDailyGoal } from '@/entities/user-goal';
import { useSelectedDateStore } from '@/features/select-date';
import { cn, detectSwipe, fromIsoDate, todayIsoDate, weekDays } from '@/shared/lib';

import styles from './WeekCalendar.module.css';
import { dayStatus, type DayStatus } from '../lib/dayStatus';

const weekdayFormatter = new Intl.DateTimeFormat('ru-RU', { weekday: 'short' });
const fullDateFormatter = new Intl.DateTimeFormat('ru-RU', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});
const monthFormatter = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' });

const STATUS_LABEL: Record<DayStatus, string> = {
  empty: 'ничего не отмечено',
  ok: 'в пределах нормы',
  over: 'больше нормы',
};

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * Календарь недели на «Сегодня» (запрос владельца 2026-11-17): Пн–Вс, под каждым днём точка —
 * пустая (ничего не отмечено), зелёная (в норме), красная (перебор по калориям).
 * Нажатие выбирает день, стрелки и свайп по полосе листают недели.
 */
export const WeekCalendar = () => {
  const date = useSelectedDateStore((state) => state.date);
  const setDate = useSelectedDateStore((state) => state.setDate);
  const shift = useSelectedDateStore((state) => state.shift);
  const entries = useMealEntryStore((state) => state.entries);
  const goal = useDailyGoal();
  const today = todayIsoDate();
  const touchStart = useRef<{ x: number; y: number; t: number } | null>(null);

  const days = useMemo(
    () =>
      weekDays(date).map((day) => {
        const dayEntries = entries.filter((entry) => entry.date === day);
        return {
          date: day,
          status: dayStatus(dayEntries.length, totalNutrients(dayEntries).kcal, goal.kcal),
        };
      }),
    [date, entries, goal.kcal],
  );

  const onTouchStart = (event: TouchEvent) => {
    const touch = event.touches[0];
    touchStart.current =
      event.touches.length === 1 && touch
        ? { x: touch.clientX, y: touch.clientY, t: event.timeStamp }
        : null;
  };
  const onTouchEnd = (event: TouchEvent) => {
    const start = touchStart.current;
    const touch = event.changedTouches[0];
    touchStart.current = null;
    if (!start || !touch) return;
    const direction = detectSwipe({
      dx: touch.clientX - start.x,
      dy: touch.clientY - start.y,
      dt: event.timeStamp - start.t,
    });
    if (direction) shift(direction === 'left' ? 7 : -7);
  };

  return (
    <section className={styles.calendar} aria-label="Календарь недели">
      <div className={styles.top}>
        <span className={styles.month}>{capitalize(monthFormatter.format(fromIsoDate(date)))}</span>
        {date !== today && (
          <button type="button" className={styles.today} onClick={() => setDate(today)}>
            Сегодня
          </button>
        )}
      </div>
      <div className={styles.row}>
        <button
          type="button"
          className={styles.arrow}
          onClick={() => shift(-7)}
          aria-label="Предыдущая неделя"
        >
          ‹
        </button>
        {/* data-no-swipe: свайп по полосе листает недели, а не разделы приложения (№42) */}
        <ol
          className={styles.days}
          data-no-swipe
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {days.map((day) => {
            const parsed = fromIsoDate(day.date);
            const selected = day.date === date;
            return (
              <li key={day.date}>
                <button
                  type="button"
                  className={cn(
                    styles.day,
                    selected && styles.selected,
                    day.date === today && styles.isToday,
                  )}
                  onClick={() => setDate(day.date)}
                  aria-pressed={selected}
                  aria-current={day.date === today ? 'date' : undefined}
                  aria-label={`${fullDateFormatter.format(parsed)}: ${STATUS_LABEL[day.status]}`}
                >
                  <span className={styles.weekday}>{weekdayFormatter.format(parsed)}</span>
                  <span className={styles.number}>{parsed.getDate()}</span>
                  <span className={cn(styles.dot, styles[day.status])} data-status={day.status} />
                </button>
              </li>
            );
          })}
        </ol>
        <button
          type="button"
          className={styles.arrow}
          onClick={() => shift(7)}
          aria-label="Следующая неделя"
        >
          ›
        </button>
      </div>
    </section>
  );
};
