import { ApiError } from '@/shared/api';

const TEXTS: Record<string, string> = {
  network_error: 'Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.',
  invalid_credentials: 'Неверная почта или пароль.',
  email_not_verified: 'Почта не подтверждена — введите код из письма.',
  email_taken: 'Эта почта уже зарегистрирована. Войдите или восстановите пароль.',
  code_invalid: 'Код неверный или устарел. Запросите новый.',
  account_blocked: 'Аккаунт заблокирован. Напишите в техподдержку.',
  rate_limited: 'Слишком много попыток. Подождите немного и попробуйте снова.',
  auth_unavailable: 'Регистрация временно недоступна. Попробуйте позже.',
  email_unavailable: 'Не получилось отправить письмо. Попробуйте чуть позже.',
  email_rejected: 'На этот адрес нельзя отправить письмо — проверьте почту.',
  validation_failed: 'Проверьте почту и пароль.',
  api_disabled: 'Сервер не подключён.',
};

/** Текст для человека по коду ошибки API аккаунта (решение №69). */
export function authErrorText(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Что-то пошло не так. Попробуйте ещё раз.';
  return TEXTS[error.code] ?? 'Не получилось. Попробуйте ещё раз.';
}
