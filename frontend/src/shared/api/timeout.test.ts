import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { isAbort, withTimeout } from './timeout';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('withTimeout', () => {
  it('через заданное время — отмена и признак тайм-аута', () => {
    const t = withTimeout(undefined, 1000);
    vi.advanceTimersByTime(999);
    expect(t.signal.aborted).toBe(false);
    vi.advanceTimersByTime(1);
    expect(t.signal.aborted).toBe(true);
    expect(t.timedOut()).toBe(true);
  });

  it('внешняя отмена передаётся, но это не тайм-аут', () => {
    const outer = new AbortController();
    const t = withTimeout(outer.signal, 1000);
    outer.abort();
    expect(t.signal.aborted).toBe(true);
    expect(t.timedOut()).toBe(false);
  });

  it('уже отменённый внешний сигнал — отмена сразу', () => {
    const outer = new AbortController();
    outer.abort();
    expect(withTimeout(outer.signal, 1000).signal.aborted).toBe(true);
  });

  it('done снимает таймер', () => {
    const t = withTimeout(undefined, 1000);
    t.done();
    vi.advanceTimersByTime(5000);
    expect(t.signal.aborted).toBe(false);
    expect(t.timedOut()).toBe(false);
  });
});

describe('isAbort', () => {
  it('узнаёт только AbortError', () => {
    expect(isAbort(new DOMException('x', 'AbortError'))).toBe(true);
    expect(isAbort(new DOMException('x', 'NetworkError'))).toBe(false);
    expect(isAbort(new Error('AbortError'))).toBe(false);
  });
});
