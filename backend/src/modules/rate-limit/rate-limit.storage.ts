import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { RedisService } from '../../redis/redis.service.js';

export const RATE_LIMIT_KEY_PREFIX = 'rl:';

/**
 * Скользящее окно в одной атомарной операции Redis. В отсортированном множестве — время
 * каждого принятого запроса. Старше окна — удаляются; если в окне меньше `limit` — запрос
 * принимается и записывается, иначе отклоняется и не записывается (поток отклонённых
 * запросов не продлевает ожидание). Время — часы Redis, одинаковые для всех экземпляров API.
 * Ответ: { число запросов с учётом текущего, мс до освобождения места в окне, 1 = отклонён }.
 */
const SLIDING_WINDOW_SCRIPT = `
local t = redis.call('TIME')
local now = tonumber(t[1]) * 1000 + math.floor(tonumber(t[2]) / 1000)
local ttl = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', now - ttl)
local count = redis.call('ZCARD', KEYS[1])
local blocked = 1
if count < limit then
  redis.call('ZADD', KEYS[1], now, ARGV[3])
  redis.call('PEXPIRE', KEYS[1], ttl)
  blocked = 0
end
local oldest = redis.call('ZRANGE', KEYS[1], 0, 0, 'WITHSCORES')
local wait = ttl
if oldest[2] then wait = tonumber(oldest[2]) + ttl - now end
return { count + 1, wait, blocked }
`;

export interface RateLimitHit {
  /** Запросов в окне с учётом текущего */
  hits: number;
  /** Через сколько миллисекунд в окне освободится место */
  retryAfterMs: number;
  blocked: boolean;
}

/** Миллисекунды → целые секунды для `Retry-After` (не меньше 1). */
export function toSeconds(ms: number): number {
  return Math.max(1, Math.ceil(ms / 1000));
}

/**
 * Счётчики лимитов в Redis: общие для всех экземпляров API и переживают перезапуск процесса.
 * После отказа запрос снова проходит, когда старейший запрос выйдет из окна.
 */
@Injectable()
export class RedisRateLimitStorage {
  constructor(private readonly redis: RedisService) {}

  async hit(key: string, ttlMs: number, limit: number): Promise<RateLimitHit> {
    const [hits, retryAfterMs, blocked] = (await this.redis.eval(
      SLIDING_WINDOW_SCRIPT,
      1,
      `${RATE_LIMIT_KEY_PREFIX}${key}`,
      ttlMs,
      limit,
      randomUUID(),
    )) as [number, number, number];
    return { hits, retryAfterMs, blocked: blocked === 1 };
  }
}
