/** Пароль: 8–128 символов, не только пробелы (как на сервере, решение №69). */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

/** Почта похожа на почту: есть «@» (точную проверку делает сервер). */
export const emailError = (email: string): string | undefined =>
  email.trim().includes('@') ? undefined : 'Введите почту';

/** Новый пароль (регистрация, сброс). */
export const newPasswordError = (password: string): string | undefined => {
  if (password.length < PASSWORD_MIN_LENGTH) return `Не меньше ${PASSWORD_MIN_LENGTH} символов`;
  if (password.length > PASSWORD_MAX_LENGTH) return `Не больше ${PASSWORD_MAX_LENGTH} символов`;
  if (!password.trim()) return 'Пароль не может состоять из пробелов';
  return undefined;
};

export const repeatError = (password: string, repeat: string): string | undefined =>
  password === repeat ? undefined : 'Пароли не совпадают';

/** Код из письма: только цифры, не больше 6 (вставка «12-34 56» тоже работает). */
export const toCode = (value: string): string => value.replace(/\D/g, '').slice(0, 6);

export const codeError = (code: string): string | undefined =>
  /^\d{6}$/.test(code) ? undefined : 'Введите 6 цифр из письма';
