import { createHash } from 'node:crypto';

import { HttpStatus, Injectable, Logger } from '@nestjs/common';

import { type CatalogFood, OFF_FIELDS, type OffProduct, parseOffProduct } from './off-parser.js';
import { AppException } from '../../common/errors/app.exception.js';
import { RedisService } from '../../redis/redis.service.js';
import { RedisRateLimitStorage } from '../rate-limit/rate-limit.storage.js';

export const OFF_SEARCH_URL = 'https://search.openfoodfacts.org/search';
/** Open Food Facts просит представляться: имя приложения и контакт (их правила использования API). */
export const OFF_USER_AGENT = 'MILO/1.0 (https://github.com/AlexGdove/MILO)';
/** Ответ на одинаковый запрос держим сутки: база Open Food Facts меняется медленно. */
export const CACHE_TTL_SECONDS = 24 * 60 * 60;
/** Не больше 8 запросов в минуту к Open Food Facts со всего сервера (у них лимит 10). */
export const UPSTREAM_LIMIT = { limit: 8, ttlMs: 60_000 };
const TIMEOUT_MS = 6000;
const PAGE_SIZE = 20;

/** Ключ кэша: регистр и лишние пробелы не делают запросы разными. */
export const cacheKey = (query: string) =>
  `off:search:${createHash('sha256').update(query.toLocaleLowerCase('ru-RU').replace(/\s+/g, ' ').trim()).digest('hex')}`;

/**
 * Поиск в Open Food Facts для браузера и PWA (решение №53): их поиск закрыт CORS, поэтому
 * сервер ходит сам — с кэшем в Redis и бережным общим лимитом. Мобильное приложение ходит
 * напрямую (нативные запросы), сервер ему не нужен.
 */
@Injectable()
export class FoodCatalogService {
  private readonly logger = new Logger(FoodCatalogService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly rateLimits: RedisRateLimitStorage,
  ) {}

  async search(query: string): Promise<{ items: CatalogFood[] }> {
    const key = cacheKey(query);
    const cached = await this.redis.get(key);
    if (cached) return JSON.parse(cached) as { items: CatalogFood[] };

    const budget = await this.rateLimits.hit(
      'off-upstream',
      UPSTREAM_LIMIT.ttlMs,
      UPSTREAM_LIMIT.limit,
    );
    if (budget.blocked) {
      throw new AppException(
        HttpStatus.SERVICE_UNAVAILABLE,
        'catalog_busy',
        'Open Food Facts limit reached, retry later',
      );
    }

    const url = new URL(OFF_SEARCH_URL);
    url.searchParams.set('q', query);
    url.searchParams.set('page_size', String(PAGE_SIZE));
    url.searchParams.set('fields', OFF_FIELDS);
    url.searchParams.set('langs', 'ru,en');

    let hits: OffProduct[];
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': OFF_USER_AGENT, Accept: 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      hits = ((await response.json()) as { hits?: OffProduct[] }).hits ?? [];
    } catch (error) {
      this.logger.warn(
        { err: error instanceof Error ? { message: error.message } : error },
        'Open Food Facts search failed',
      );
      throw new AppException(
        HttpStatus.SERVICE_UNAVAILABLE,
        'catalog_unavailable',
        'Open Food Facts is unavailable',
      );
    }

    const result = { items: hits.map(parseOffProduct).filter((f): f is CatalogFood => f !== null) };
    await this.redis.set(key, JSON.stringify(result), 'EX', CACHE_TTL_SECONDS);
    return result;
  }
}
