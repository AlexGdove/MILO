import { describe, expect, it } from 'vitest';

import { formatAmount, isUnit, roundAmount, toGrams, unitLabel, UNITS, type Unit } from './units';

describe('units', () => {
  it('UNITS перечисляет г, мл, шт', () => {
    expect(UNITS.map((u) => u.label)).toEqual(['г', 'мл', 'шт']);
  });

  it('isUnit распознаёт только известные единицы', () => {
    expect(isUnit('g')).toBe(true);
    expect(isUnit('ml')).toBe(true);
    expect(isUnit('pcs')).toBe(true);
    expect(isUnit('kg')).toBe(false);
    expect(isUnit(undefined)).toBe(false);
    expect(isUnit(1)).toBe(false);
  });

  it('unitLabel', () => {
    expect(unitLabel('pcs')).toBe('шт');
  });

  it.each<[number, Unit, number | undefined, number]>([
    [150, 'g', undefined, 150],
    [200, 'ml', undefined, 200],
    [2, 'pcs', 55, 110],
    [0.5, 'pcs', 120, 60],
    [3, 'pcs', undefined, 0],
    [3, 'pcs', 0, 0],
  ])('toGrams(%s, %s, %s) = %s', (amount, unit, pieceWeight, expected) => {
    expect(toGrams(amount, unit, pieceWeight)).toBe(expected);
  });

  it.each<[number, Unit, number]>([
    [12.6, 'g', 13],
    [99.4, 'ml', 99],
    [1.26, 'pcs', 1.3],
    [2, 'pcs', 2],
  ])('roundAmount(%s, %s) = %s', (amount, unit, expected) => {
    expect(roundAmount(amount, unit)).toBe(expected);
  });

  it.each<[number, Unit, string]>([
    [1.5, 'pcs', '1,5 шт'],
    [250, 'ml', '250 мл'],
    [100.4, 'g', '100 г'],
  ])('formatAmount(%s, %s) = %s', (amount, unit, expected) => {
    expect(formatAmount(amount, unit)).toBe(expected);
  });
});
