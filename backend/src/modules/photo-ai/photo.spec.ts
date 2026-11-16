import { detectPhotoMime, effectivePlan } from './photo.js';

const RIFF = [0x52, 0x49, 0x46, 0x46];

describe('detectPhotoMime', () => {
  it('узнаёт JPEG, PNG и WebP по первым байтам', () => {
    expect(detectPhotoMime(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
    expect(detectPhotoMime(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(
      'image/png',
    );
    expect(detectPhotoMime(new Uint8Array([...RIFF, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50]))).toBe(
      'image/webp',
    );
  });

  it('RIFF без WEBP (например, WAVE) — не картинка', () => {
    expect(
      detectPhotoMime(new Uint8Array([...RIFF, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45])),
    ).toBeNull();
  });

  it('текст, пустой файл и GIF — не подходят', () => {
    expect(detectPhotoMime(new TextEncoder().encode('hello'))).toBeNull();
    expect(detectPhotoMime(new Uint8Array([]))).toBeNull();
    expect(detectPhotoMime(new Uint8Array([0x47, 0x49, 0x46, 0x38]))).toBeNull();
  });
});

describe('effectivePlan', () => {
  const now = new Date('2026-11-16T12:00:00Z');
  const past = new Date(now.getTime() - 1000);
  const future = new Date(now.getTime() + 1000);

  it('бесплатный остаётся бесплатным при любой дате', () => {
    expect(effectivePlan('free', null, now)).toBe('free');
    expect(effectivePlan('free', future, now)).toBe('free');
  });

  it('платный без срока или со сроком в будущем действует', () => {
    expect(effectivePlan('plus', null, now)).toBe('plus');
    expect(effectivePlan('plus', future, now)).toBe('plus');
    expect(effectivePlan('unlimited', null, now)).toBe('unlimited');
  });

  it('платный с истёкшим сроком считается бесплатным', () => {
    expect(effectivePlan('plus', past, now)).toBe('free');
    expect(effectivePlan('unlimited', past, now)).toBe('free');
  });

  it('срок, равный текущему моменту, уже истёк', () => {
    expect(effectivePlan('plus', now, now)).toBe('free');
  });
});
