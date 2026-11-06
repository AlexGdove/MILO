/** Направление движения пальца: `left` — палец ушёл влево (следующая страница). */
export type SwipeDirection = 'left' | 'right';

export interface SwipeGesture {
  /** Сдвиг по горизонтали, px (вправо — положительный) */
  dx: number;
  /** Сдвиг по вертикали, px */
  dy: number;
  /** Длительность жеста, мс */
  dt: number;
}

/** Не меньше 70 px по горизонтали — случайное касание при прокрутке не переключит страницу. */
export const SWIPE_MIN_DISTANCE = 70;
/** Горизонталь должна преобладать вдвое: косой жест — это прокрутка, а не свайп. */
export const SWIPE_DIRECTION_RATIO = 2;
/** Медленное перетаскивание дольше 700 мс — не свайп (например, выделение текста). */
export const SWIPE_MAX_DURATION = 700;

/** Свайп ли это и в какую сторону; иначе `null`. */
export function detectSwipe({ dx, dy, dt }: SwipeGesture): SwipeDirection | null {
  if (dt > SWIPE_MAX_DURATION) return null;
  if (Math.abs(dx) < SWIPE_MIN_DISTANCE) return null;
  if (Math.abs(dx) < SWIPE_DIRECTION_RATIO * Math.abs(dy)) return null;
  return dx < 0 ? 'left' : 'right';
}

/**
 * Соседний раздел: свайп влево — следующий, вправо — предыдущий; по краям не зацикливается.
 * Только с корневой страницы раздела (`/recipes`, но не `/recipes/:id`).
 */
export function adjacentSection(
  sections: readonly string[],
  pathname: string,
  direction: SwipeDirection,
): string | null {
  const index = sections.indexOf(pathname);
  if (index < 0) return null;
  const next = sections[index + (direction === 'left' ? 1 : -1)];
  return next ?? null;
}
