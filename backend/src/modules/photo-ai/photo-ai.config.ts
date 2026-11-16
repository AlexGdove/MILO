import type { ConfigService } from '@nestjs/config';

import type { PhotoAiProviderName } from '../../config/env.validation.js';

/** Сколько ждать ответа модели: локальная отвечает за 10–20 с, с запасом на очередь */
export const DEFAULT_PHOTO_AI_TIMEOUT_MS = 120_000;
/** Распознаваний в сутки на тарифе `plus` (решение №68: лимиты — в настройках, не в коде) */
export const DEFAULT_PHOTO_AI_DAILY_LIMIT = 20;
/**
 * Распознаваний в сутки на тарифе Pro (`unlimited`): защита от злоупотреблений, решение владельца
 * 2026-11-16 (№76) — фото стоит ≈ 0,5 ₽, Pro 500 ₽ в месяц окупается до ~30 фото в день
 */
export const DEFAULT_PHOTO_AI_PRO_DAILY_LIMIT = 50;
/**
 * Бесплатных распознаваний в неделю для вошедших на бесплатном тарифе (№76): попробовать главную
 * функцию, ≈ 6 ₽ в месяц на пользователя. 0 — на бесплатном тарифе фото нет
 */
export const DEFAULT_PHOTO_AI_FREE_WEEKLY_LIMIT = 3;
/** Сколько запросов может ждать своей очереди: модель отвечает на один запрос за раз */
export const DEFAULT_PHOTO_AI_MAX_WAITING = 5;

/** Фото после сжатия на клиенте (до 1280 px, JPEG) — сотни килобайт; предел с запасом */
export const PHOTO_MAX_BYTES = 2 * 1024 * 1024;
/** Предел тела запроса: base64 на треть больше файла + поле подсказки */
export const PHOTO_BODY_LIMIT = '3mb';
export const PHOTO_HINT_MAX_LENGTH = 200;

export interface PhotoAiConfig {
  /** Распознавание работает: выбран провайдер и задан его адрес */
  enabled: boolean;
  provider: PhotoAiProviderName;
  baseUrl: string;
  model: string | null;
  apiKey: string | null;
  /** Заголовок `OpenAI-Project` — у Yandex AI Studio это идентификатор каталога */
  project: string | null;
  timeoutMs: number;
  dailyLimit: number;
  /** Предел тарифа Pro (`unlimited`) */
  proDailyLimit: number;
  /** Бесплатный тариф: распознаваний в неделю (0 — нельзя) */
  freeWeeklyLimit: number;
  maxWaiting: number;
}

interface PhotoAiEnv {
  PHOTO_AI_PROVIDER?: PhotoAiProviderName;
  PHOTO_AI_BASE_URL?: string;
  PHOTO_AI_MODEL?: string;
  PHOTO_AI_API_KEY?: string;
  PHOTO_AI_PROJECT?: string;
  PHOTO_AI_TIMEOUT_MS?: number | string;
  PHOTO_AI_DAILY_LIMIT?: number | string;
  PHOTO_AI_PRO_DAILY_LIMIT?: number | string;
  PHOTO_AI_FREE_WEEKLY_LIMIT?: number | string;
}

/**
 * Настройки распознавания блюд по фото (решения №68, №75). Без `PHOTO_AI_PROVIDER` функция
 * выключена: маршрут отвечает `503 photo_ai_unavailable`. Провайдер `openai` — любой сервер
 * с OpenAI-совместимым `POST /v1/chat/completions` и приёмом картинок: локальная Strata
 * сейчас, облачная модель позже — меняется только настройка.
 */
export function toPhotoAiConfig(env: PhotoAiEnv): PhotoAiConfig {
  const provider = env.PHOTO_AI_PROVIDER ?? 'off';
  const baseUrl = (env.PHOTO_AI_BASE_URL ?? '').replace(/\/+$/, '');
  return {
    enabled: provider !== 'off' && baseUrl !== '',
    provider,
    baseUrl,
    model: env.PHOTO_AI_MODEL ?? null,
    apiKey: env.PHOTO_AI_API_KEY ?? null,
    project: env.PHOTO_AI_PROJECT ?? null,
    // `ConfigService` отдаёт значение из `process.env` строкой — приводим к числу сами
    timeoutMs: Number(env.PHOTO_AI_TIMEOUT_MS ?? DEFAULT_PHOTO_AI_TIMEOUT_MS),
    dailyLimit: Number(env.PHOTO_AI_DAILY_LIMIT ?? DEFAULT_PHOTO_AI_DAILY_LIMIT),
    proDailyLimit: Number(env.PHOTO_AI_PRO_DAILY_LIMIT ?? DEFAULT_PHOTO_AI_PRO_DAILY_LIMIT),
    freeWeeklyLimit: Number(env.PHOTO_AI_FREE_WEEKLY_LIMIT ?? DEFAULT_PHOTO_AI_FREE_WEEKLY_LIMIT),
    maxWaiting: DEFAULT_PHOTO_AI_MAX_WAITING,
  };
}

export function getPhotoAiConfig(config: ConfigService): PhotoAiConfig {
  return toPhotoAiConfig({
    PHOTO_AI_PROVIDER: config.get('PHOTO_AI_PROVIDER'),
    PHOTO_AI_BASE_URL: config.get('PHOTO_AI_BASE_URL'),
    PHOTO_AI_MODEL: config.get('PHOTO_AI_MODEL'),
    PHOTO_AI_API_KEY: config.get('PHOTO_AI_API_KEY'),
    PHOTO_AI_PROJECT: config.get('PHOTO_AI_PROJECT'),
    PHOTO_AI_TIMEOUT_MS: config.get('PHOTO_AI_TIMEOUT_MS'),
    PHOTO_AI_DAILY_LIMIT: config.get('PHOTO_AI_DAILY_LIMIT'),
    PHOTO_AI_PRO_DAILY_LIMIT: config.get('PHOTO_AI_PRO_DAILY_LIMIT'),
    PHOTO_AI_FREE_WEEKLY_LIMIT: config.get('PHOTO_AI_FREE_WEEKLY_LIMIT'),
  });
}
