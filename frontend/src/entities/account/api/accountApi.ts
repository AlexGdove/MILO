import { apiRequest } from '@/shared/api';

import type { Account, CodeSent, IssuedSession } from '../model/types';

/** Запросы аккаунта (`docs/backend/api.md`, «Аккаунты»; решение №69). */
export const accountApi = {
  register: (email: string, password: string) =>
    apiRequest<CodeSent>('/auth/register', { method: 'POST', body: { email, password } }),

  resendCode: (email: string) =>
    apiRequest<CodeSent>('/auth/register/resend', { method: 'POST', body: { email } }),

  verifyEmail: (email: string, code: string) =>
    apiRequest<IssuedSession>('/auth/register/verify', { method: 'POST', body: { email, code } }),

  login: (email: string, password: string) =>
    apiRequest<IssuedSession>('/auth/login', { method: 'POST', body: { email, password } }),

  forgotPassword: (email: string) =>
    apiRequest<CodeSent>('/auth/password/forgot', { method: 'POST', body: { email } }),

  resetPassword: (email: string, code: string, password: string) =>
    apiRequest<IssuedSession>('/auth/password/reset', {
      method: 'POST',
      body: { email, code, password },
    }),

  me: (token: string) => apiRequest<Account>('/account/me', { authToken: token }),

  logout: (token: string) => apiRequest<void>('/auth/logout', { method: 'POST', authToken: token }),

  remove: (token: string) =>
    apiRequest<void>('/account/me', { method: 'DELETE', authToken: token }),
};
