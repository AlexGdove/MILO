import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { matchFood } from './food-match.js';
import { FOOD_REFERENCE_NAMES, type Per100g } from './food-reference.js';
import { getPhotoAiConfig, PHOTO_MAX_BYTES, type PhotoAiConfig } from './photo-ai.config.js';
import { detectPhotoMime, effectivePlan } from './photo.js';
import { parseRecognition } from './recognition-parser.js';
import { buildRecognitionPrompt } from './recognition-prompt.js';
import { VisionProvider, VisionProviderError } from './vision-provider.js';
import { AppException } from '../../common/errors/app.exception.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisRateLimitStorage } from '../rate-limit/rate-limit.storage.js';

const DAY_MS = 24 * 60 * 60_000;
const WEEK_MS = 7 * DAY_MS;

export interface RecognizedIngredientView {
  /** Как продукт назвала модель */
  name: string;
  grams: number;
  /** Запись справочника, по которой посчитано КБЖУ; `null` — в базе нет, выбирает пользователь */
  matchedName: string | null;
  per100g: Per100g | null;
}

export type QuotaPeriod = 'day' | 'week';

export interface RecognitionView {
  dish: string;
  ingredients: RecognizedIngredientView[];
  /**
   * Использовано и предел за скользящие 7 дней: Plus 20, Pro 50, бесплатный 3 (решения №76, №79).
   * `day` остаётся в типе для совместимости с приложениями старых версий
   */
  usage: { used: number; limit: number; period: QuotaPeriod };
}

const fail = (status: HttpStatus, code: string, message: string) =>
  new AppException(status, code, message);

/**
 * Распознавание блюда по фото (решения №68, №75): тариф и недельный лимит → очередь к модели →
 * разбор ответа → КБЖУ по справочнику. Фото и подсказка не сохраняются и не пишутся в лог.
 */
@Injectable()
export class PhotoAiService {
  private readonly logger = new Logger(PhotoAiService.name);
  private readonly config: PhotoAiConfig;
  /** Модель отвечает на один запрос за раз: запросы идут по очереди */
  private tail: Promise<unknown> = Promise.resolve();
  private waiting = 0;

  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly limits: RedisRateLimitStorage,
    private readonly provider: VisionProvider,
  ) {
    this.config = getPhotoAiConfig(config);
  }

  async recognize(
    accountId: string,
    input: { image: string; hint?: string },
    now = new Date(),
  ): Promise<RecognitionView> {
    if (!this.config.enabled) {
      throw fail(HttpStatus.SERVICE_UNAVAILABLE, 'photo_ai_unavailable', 'Photo AI is disabled');
    }
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: { plan: true, planUntil: true },
    });
    if (!account) {
      throw fail(HttpStatus.UNAUTHORIZED, 'session_invalid', 'Session is invalid');
    }
    const plan = effectivePlan(account.plan, account.planUntil, now);
    // Квота по тарифу (№76, №79): все пределы — за скользящие 7 дней. Счётчики бесплатного и
    // платных тарифов разные: оплата среди недели даёт полный недельный предел тарифа
    const quota =
      plan === 'free'
        ? {
            key: `photoAiFree:${accountId}`,
            windowMs: WEEK_MS,
            limit: this.config.freeWeeklyLimit,
            period: 'week' as const,
          }
        : {
            // Новый ключ: старые суточные счётчики `photoAi:` не смешиваются с недельными
            key: `photoAiPaid:${accountId}`,
            windowMs: WEEK_MS,
            limit: plan === 'plus' ? this.config.plusWeeklyLimit : this.config.proWeeklyLimit,
            period: 'week' as const,
          };
    if (quota.limit === 0) {
      throw fail(HttpStatus.FORBIDDEN, 'photo_ai_plan_required', 'A paid plan is required');
    }

    const bytes = Buffer.from(input.image, 'base64');
    const mime = detectPhotoMime(bytes);
    if (bytes.length === 0 || bytes.length > PHOTO_MAX_BYTES || mime === null) {
      throw fail(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'photo_invalid',
        'Photo is not a supported image',
      );
    }
    // Очередь проверяется до лимита: отказ «занято» не должен тратить попытку пользователя
    if (this.waiting >= this.config.maxWaiting) {
      throw fail(HttpStatus.SERVICE_UNAVAILABLE, 'photo_ai_busy', 'Photo AI is busy');
    }

    const hit = await this.limits.hit(quota.key, quota.windowMs, quota.limit);
    if (hit.blocked) {
      throw fail(HttpStatus.TOO_MANY_REQUESTS, 'photo_ai_limit', 'Photo limit is reached');
    }
    const usage: RecognitionView['usage'] = {
      used: hit.hits,
      limit: quota.limit,
      period: quota.period,
    };

    const hint = input.hint?.trim() ?? '';
    const raw = await this.enqueue(() =>
      this.provider.recognize({
        imageBase64: bytes.toString('base64'),
        mime,
        prompt: buildRecognitionPrompt(FOOD_REFERENCE_NAMES, hint === '' ? null : hint),
      }),
    ).catch((error: unknown) => {
      const reason = error instanceof VisionProviderError ? error.reason : 'unknown';
      this.logger.warn(`Photo recognition failed: ${reason}`);
      throw fail(HttpStatus.BAD_GATEWAY, 'photo_ai_failed', 'Photo recognition failed');
    });

    const recognized = parseRecognition(raw);
    if (recognized === null) {
      this.logger.warn('Photo recognition failed: unparsable reply');
      throw fail(HttpStatus.BAD_GATEWAY, 'photo_ai_failed', 'Photo recognition failed');
    }
    if (recognized.dish === null || recognized.ingredients.length === 0) {
      throw fail(HttpStatus.UNPROCESSABLE_ENTITY, 'photo_no_food', 'No food found in the photo');
    }

    return {
      dish: recognized.dish,
      ingredients: recognized.ingredients.map(({ name, grams }) => {
        const food = matchFood(name);
        return { name, grams, matchedName: food?.name ?? null, per100g: food?.per100g ?? null };
      }),
      usage,
    };
  }

  /** Выполняет задачи строго по одной, в порядке поступления; ошибка одной не ломает очередь. */
  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    this.waiting += 1;
    const run = this.tail.then(task, task).finally(() => {
      this.waiting -= 1;
    });
    this.tail = run.catch(() => undefined);
    return run;
  }
}
