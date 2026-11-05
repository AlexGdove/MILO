import { describe, expect, it } from 'vitest';

import { plural } from './plural';

const YEARS = ['год', 'года', 'лет'] as const;

describe('plural', () => {
  it.each([
    [1, 'год'],
    [21, 'год'],
    [2, 'года'],
    [24, 'года'],
    [5, 'лет'],
    [11, 'лет'],
    [14, 'лет'],
    [25, 'лет'],
    [100, 'лет'],
    [101, 'год'],
    [0, 'лет'],
  ])('%i → %s', (count, expected) => {
    expect(plural(count, YEARS)).toBe(expected);
  });
});
