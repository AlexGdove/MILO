import { describe, expect, it } from 'vitest';

import { newPasswordError, PASSWORD_MAX_LENGTH } from './validation';

const LAYOUT = 'Только латиница — похоже, включена русская раскладка';
const NOT_ASCII = 'Только латинские буквы, цифры и символы';

describe('newPasswordError', () => {
  it('латиница, цифры, знаки и пробел — подходит', () => {
    expect(newPasswordError('correct horse 1')).toBeUndefined();
    expect(newPasswordError('Pa$$w0rd!')).toBeUndefined();
    expect(newPasswordError('~!@#$%^&*()_+{}|:"<>?')).toBeUndefined();
  });

  it('короче 8 символов — ошибка длины', () => {
    expect(newPasswordError('abc12')).toBe('Не меньше 8 символов');
  });

  it('длиннее максимума — ошибка длины', () => {
    expect(newPasswordError('a'.repeat(PASSWORD_MAX_LENGTH + 1))).toBe(
      `Не больше ${PASSWORD_MAX_LENGTH} символов`,
    );
    expect(newPasswordError('a'.repeat(PASSWORD_MAX_LENGTH))).toBeUndefined();
  });

  it('только пробелы — ошибка', () => {
    expect(newPasswordError(' '.repeat(8))).toBe('Пароль не может состоять из пробелов');
  });

  it('кириллица — подсказка про раскладку', () => {
    expect(newPasswordError('пароль123')).toBe(LAYOUT);
    expect(newPasswordError('passwordЁ')).toBe(LAYOUT); // «Ё»
    // Одна кириллическая «о» (U+043E) среди латиницы — на глаз не отличить
    expect(newPasswordError('Passwоrd1')).toBe(LAYOUT);
  });

  it('другие не-ASCII символы — ошибка', () => {
    expect(newPasswordError('pässword1')).toBe(NOT_ASCII); // «ä»
    expect(newPasswordError('password\u{1F600}1')).toBe(NOT_ASCII); // эмодзи
    expect(newPasswordError('pass\tword1')).toBe(NOT_ASCII); // табуляция
  });
});
