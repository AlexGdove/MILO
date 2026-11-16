import { describe, expect, it } from 'vitest';

import { fitSize, PHOTO_MAX_SIDE } from './resizePhoto';

describe('fitSize', () => {
  it('уменьшает снимок по длинной стороне, сохраняя пропорции', () => {
    expect(fitSize(4000, 3000)).toEqual({ width: PHOTO_MAX_SIDE, height: 960 });
    expect(fitSize(3000, 4000)).toEqual({ width: 960, height: PHOTO_MAX_SIDE });
  });

  it('маленький снимок не увеличивает', () => {
    expect(fitSize(640, 480)).toEqual({ width: 640, height: 480 });
    expect(fitSize(PHOTO_MAX_SIDE, 100)).toEqual({ width: PHOTO_MAX_SIDE, height: 100 });
  });

  it('очень вытянутый снимок не схлопывается в ноль', () => {
    expect(fitSize(10_000, 2)).toEqual({ width: PHOTO_MAX_SIDE, height: 1 });
  });

  it('принимает свой предел', () => {
    expect(fitSize(1000, 500, 100)).toEqual({ width: 100, height: 50 });
  });
});
