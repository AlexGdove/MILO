import { describe, expect, it } from 'vitest';

import {
  adjacentSection,
  detectSwipe,
  SWIPE_MAX_DURATION,
  SWIPE_MIN_DISTANCE,
  type SwipeDirection,
} from './swipe';

const SECTIONS = ['/', '/recipes', '/pantry', '/profile'];

describe('detectSwipe', () => {
  it.each([
    [{ dx: -100, dy: 10, dt: 200 }, 'left'],
    [{ dx: 100, dy: 10, dt: 200 }, 'right'],
    [{ dx: -70, dy: 35, dt: 700 }, 'left'],
  ] as const)('жест %o → %s', (gesture, expected) => {
    expect(detectSwipe(gesture)).toBe(expected);
  });

  it.each([
    ['короткий', { dx: -69, dy: 0, dt: 100 }],
    ['косой', { dx: -100, dy: 51, dt: 100 }],
    ['медленный', { dx: -200, dy: 0, dt: 701 }],
    ['вертикальный', { dx: 0, dy: -300, dt: 100 }],
  ])('не свайп: %s', (_name, gesture) => {
    expect(detectSwipe(gesture)).toBeNull();
  });

  it('пороги: 70 px и 700 мс', () => {
    expect(SWIPE_MIN_DISTANCE).toBe(70);
    expect(SWIPE_MAX_DURATION).toBe(700);
  });
});

describe('adjacentSection', () => {
  it.each<[string, SwipeDirection, string | null]>([
    ['/', 'left', '/recipes'],
    ['/recipes', 'left', '/pantry'],
    ['/pantry', 'right', '/recipes'],
    ['/recipes', 'right', '/'],
    ['/profile', 'left', null],
    ['/', 'right', null],
    ['/recipes/abc', 'left', null],
    ['/app', 'right', null],
  ])('%s, свайп %s → %s', (pathname, direction, expected) => {
    expect(adjacentSection(SECTIONS, pathname, direction)).toBe(expected);
  });
});
