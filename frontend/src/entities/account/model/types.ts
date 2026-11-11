/** Тариф (решение №68): бесплатный / платный с лимитом фото-ИИ / безлимитный. */
export type Plan = 'free' | 'plus' | 'unlimited';

/** Аккаунт с сервера: только почта и тариф — личные данные остаются на устройстве (№60). */
export interface Account {
  id: string;
  email: string;
  plan: Plan;
  /** До какого момента оплачен тариф (ISO); `null` — бессрочно или free */
  planUntil: string | null;
}

/** Ответ на вход, подтверждение почты и сброс пароля. */
export interface IssuedSession {
  token: string;
  account: Account;
}

/** Код отправлен (или ответ, неотличимый от отправки). */
export interface CodeSent {
  expiresInSeconds: number;
}
