export type DayStatus = 'empty' | 'ok' | 'over';

/**
 * Состояние дня для точки в календаре недели:
 * `empty` — записей нет; `over` — съедено больше нормы; `ok` — записи есть, не больше нормы.
 * Норма 0 или меньше (не задана) перебором не считается.
 */
export function dayStatus(entriesCount: number, eatenKcal: number, goalKcal: number): DayStatus {
  if (entriesCount === 0) return 'empty';
  if (goalKcal > 0 && eatenKcal > goalKcal) return 'over';
  return 'ok';
}
