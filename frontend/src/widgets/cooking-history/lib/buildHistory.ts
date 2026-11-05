import type { CookedDish } from '@/entities/cooked-dish';
import type { MealEntry, MealType } from '@/entities/meal-entry';
import { toIsoDate, type IsoDate } from '@/shared/lib';

export type HistoryEvent =
  | { kind: 'cooked'; id: string; at: number; name: string; portions: number }
  | { kind: 'eaten'; id: string; at: number; name: string; portions: number; mealType: MealType };

export interface HistoryDay {
  date: IsoDate;
  /** События дня, новые сверху */
  events: HistoryEvent[];
}

/**
 * Журнал готовки и съеденного по дням (новые дни сверху).
 * Готовка — из приготовленных блюд; съеденное — из записей «Сегодня» с источником-блюдом.
 * Рецепт, записанный без готовки (источник — сам рецепт), в историю готовки не попадает.
 */
export const buildHistory = (
  dishes: readonly CookedDish[],
  entries: readonly MealEntry[],
): HistoryDay[] => {
  const dishIds = new Set(dishes.map((dish) => dish.id));
  const events: Array<HistoryEvent & { date: IsoDate }> = [
    ...dishes.map((dish) => ({
      kind: 'cooked' as const,
      id: dish.id,
      at: dish.cookedAt,
      date: toIsoDate(new Date(dish.cookedAt)),
      name: dish.name,
      portions: dish.servingsTotal,
    })),
    ...entries
      .filter((entry) => entry.source.type === 'recipe' && dishIds.has(entry.source.id))
      .map((entry) => ({
        kind: 'eaten' as const,
        id: entry.id,
        at: entry.createdAt,
        date: entry.date,
        name: entry.productName,
        portions: entry.stockDeducted,
        mealType: entry.mealType,
      })),
  ];

  const byDate = new Map<IsoDate, HistoryEvent[]>();
  for (const { date, ...event } of events.sort((a, b) => b.at - a.at)) {
    const day = byDate.get(date) ?? [];
    day.push(event as HistoryEvent);
    byDate.set(date, day);
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([date, dayEvents]) => ({ date, events: dayEvents }));
};
