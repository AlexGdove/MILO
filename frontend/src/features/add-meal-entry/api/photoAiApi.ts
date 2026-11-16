import { ApiError, apiRequest, NETWORK_ERROR } from '@/shared/api';

import type { Recognition } from '../lib/photoDish';

/** Модель отвечает 10–20 с, а запросы идут по очереди — ждём дольше обычного запроса */
export const PHOTO_REQUEST_TIMEOUT_MS = 150_000;

/** Распознавание блюда по фото (`docs/backend/api.md`, «Фото-ИИ»; решения №68, №75). */
export const photoAiApi = {
  recognize: (token: string, image: string, hint: string) =>
    apiRequest<Recognition>('/photo-ai/recognize', {
      method: 'POST',
      authToken: token,
      body: hint.trim() === '' ? { image } : { image, hint: hint.trim() },
      timeoutMs: PHOTO_REQUEST_TIMEOUT_MS,
    }),
};

const ERROR_TEXT: Record<string, string> = {
  photo_ai_plan_required: 'Распознавание по фото доступно на платном тарифе',
  // Бесплатный тариф при исчерпанной квоте — своя фраза, `FREE_LIMIT_TEXT`

  photo_ai_limit: 'Лимит распознаваний на сегодня исчерпан — попробуйте завтра',
  photo_ai_busy: 'Сейчас много запросов — попробуйте через минуту',
  photo_ai_unavailable: 'Распознавание по фото сейчас недоступно',
  photo_ai_failed: 'Не получилось распознать фото — попробуйте ещё раз',
  photo_no_food: 'На фото не видно еды — попробуйте другой снимок или опишите блюдо',
  photo_invalid: 'Этот файл не подходит — нужен снимок в формате JPEG или PNG',
  session_required: 'Войдите в аккаунт на вкладке «Профиль»',
  session_invalid: 'Войдите в аккаунт заново на вкладке «Профиль»',
  rate_limited: 'Слишком много запросов — попробуйте через несколько минут',
  [NETWORK_ERROR]: 'Нет связи с сервером — проверьте интернет и попробуйте ещё раз',
};

/** Бесплатный тариф исчерпал недельную квоту (№76) */
export const FREE_LIMIT_TEXT =
  'Бесплатные распознавания на этой неделе закончились. Без ограничений по неделям — на тарифе Plus';

/** Текст ошибки распознавания для пользователя. */
export const photoErrorText = (error: unknown): string =>
  (error instanceof ApiError ? ERROR_TEXT[error.code] : undefined) ??
  'Не получилось распознать фото — попробуйте ещё раз';
