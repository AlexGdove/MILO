import { describe, expect, it } from 'vitest';

import { parseNumber } from './number';

describe('parseNumber', () => {
  it.each([
    ['100', 100],
    ['15,5', 15.5],
    ['15.5', 15.5],
    ['  42 ', 42],
    ['0', 0],
    ['-3', -3],
  ])('"%s" → %s', (input, expected) => {
    expect(parseNumber(input)).toBe(expected);
  });

  it.each([[''], ['   '], ['abc'], ['1,2,3'], ['12г']])('"%s" → null', (input) => {
    expect(parseNumber(input)).toBeNull();
  });
});
