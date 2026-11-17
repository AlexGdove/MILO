import { describe, expect, it } from 'vitest';

import { dayStatus } from './dayStatus';

describe('dayStatus', () => {
  it('без записей — empty, даже если ккал больше нуля', () => {
    expect(dayStatus(0, 1000, 2000)).toBe('empty');
  });

  it('записи есть и съедено меньше нормы — ok', () => {
    expect(dayStatus(2, 1500, 2000)).toBe('ok');
  });

  it('ровно норма — ok', () => {
    expect(dayStatus(3, 2000, 2000)).toBe('ok');
  });

  it('на 1 ккал больше нормы — over', () => {
    expect(dayStatus(4, 2001, 2000)).toBe('over');
  });

  it('норма не задана (0 или меньше) — ok', () => {
    expect(dayStatus(5, 3000, 0)).toBe('ok');
    expect(dayStatus(1, 100, -100)).toBe('ok');
  });
});
