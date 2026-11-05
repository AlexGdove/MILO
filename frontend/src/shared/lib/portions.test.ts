import { describe, expect, it } from 'vitest';

import { formatPortions, roundPortions } from './portions';

describe('roundPortions', () => {
  it('округляет до тысячных', () => {
    expect(roundPortions(0.4504)).toBe(0.45);
    expect(roundPortions(1.23456)).toBe(1.235);
    expect(roundPortions(2)).toBe(2);
  });
});

describe('formatPortions', () => {
  it('целые и дробные — до десятых, с запятой', () => {
    expect(formatPortions(2)).toBe('2');
    expect(formatPortions(2.5)).toBe('2,5');
    expect(formatPortions(0.45)).toBe('0,5');
  });

  it('ноль — «0»', () => {
    expect(formatPortions(0)).toBe('0');
  });

  it('крошечный остаток не выглядит как ноль', () => {
    expect(formatPortions(0.03)).toBe('< 0,1');
  });
});
