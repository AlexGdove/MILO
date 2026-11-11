import { describe, expect, it } from 'vitest';

import { ApiError } from '@/shared/api';

import { authErrorText } from './authErrorText';

describe('authErrorText', () => {
  it('не ApiError — общий текст (даже с полем code)', () => {
    expect(authErrorText(new Error('random'))).toBe('Что-то пошло не так. Попробуйте ещё раз.');
    expect(authErrorText(Object.assign(new Error('x'), { code: 'invalid_credentials' }))).toBe(
      'Что-то пошло не так. Попробуйте ещё раз.',
    );
  });

  it('известные коды', () => {
    expect(authErrorText(new ApiError(0, 'network_error', ''))).toBe(
      'Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.',
    );
    expect(authErrorText(new ApiError(401, 'invalid_credentials', ''))).toBe(
      'Неверная почта или пароль.',
    );
    expect(authErrorText(new ApiError(403, 'account_blocked', ''))).toBe(
      'Аккаунт заблокирован. Напишите в техподдержку.',
    );
    expect(authErrorText(new ApiError(503, 'auth_unavailable', ''))).toBe(
      'Регистрация временно недоступна. Попробуйте позже.',
    );
  });

  it('неизвестный код', () => {
    expect(authErrorText(new ApiError(500, 'unknown_code', ''))).toBe(
      'Не получилось. Попробуйте ещё раз.',
    );
  });
});
