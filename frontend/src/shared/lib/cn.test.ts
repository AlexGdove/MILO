import { describe, expect, it } from 'vitest';

import { cn } from './cn';

describe('cn', () => {
  it('склеивает классы через пробел и пропускает пустые значения', () => {
    expect(cn('a', false, null, undefined, '', 'b')).toBe('a b');
  });

  it('без аргументов возвращает пустую строку', () => {
    expect(cn()).toBe('');
  });
});
