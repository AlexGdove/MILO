import { createHash } from 'node:crypto';

import {
  type CanActivate,
  type ExecutionContext,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';

import { normalizeIp } from './normalize-ip.js';
import { RATE_LIMIT_POLICY, SKIP_GLOBAL_RATE_LIMIT } from './rate-limit.decorator.js';
import {
  GLOBAL_RATE_LIMIT,
  RATE_LIMIT_POLICIES,
  type RateLimitPolicy,
  type RateLimitPolicyName,
} from './rate-limit.policies.js';
import { type RateLimitHit, RedisRateLimitStorage, toSeconds } from './rate-limit.storage.js';
import { AppException } from '../../common/errors/app.exception.js';
import { DEVICE_KEY_HEADER } from '../device-keys/device-key.js';

export interface TrackedRequest {
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
}

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

/** IP клиента: за доверенными прокси Express берёт его из X-Forwarded-For (TRUST_PROXY). */
export function ipTracker(req: TrackedRequest): string {
  return `ip:${normalizeIp(req.ip ?? 'unknown')}`;
}

/**
 * Ключ устройства (хэш — сам ключ в Redis не попадает); без заголовка — IP. Guard ключа
 * срабатывает позже, поэтому поддельный ключ тоже получает свой счётчик, но запрос с ним
 * всё равно отклоняется (401), а общий лимит по IP действует всегда.
 */
export function deviceTracker(req: TrackedRequest): string {
  const header = req.headers[DEVICE_KEY_HEADER];
  return typeof header === 'string' && header.length > 0 ? `dk:${sha256(header)}` : ipTracker(req);
}

/** Ключ счётчика в Redis: один на действие и клиента, общий для всех маршрутов действия. */
export function rateLimitKey(name: string, policy: RateLimitPolicy, req: TrackedRequest): string {
  const tracker = policy.tracker === 'ip' ? ipTracker(req) : deviceTracker(req);
  return `${name}:${sha256(tracker)}`;
}

/**
 * Лимиты запросов (`architecture.md` §5): общий — на каждый запрос, кроме отмеченных
 * `@SkipGlobalRateLimit()`, и лимит действия из `@RateLimit(name)`. Превышение —
 * `429 rate_limited` с `Retry-After` в секундах. Недоступный Redis — `503
 * service_unavailable`: без лимитов (а другой защиты нет — аккаунтов нет) запросы не
 * пропускаются.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private readonly storage: RedisRateLimitStorage,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    const names: string[] = [];
    if (!this.reflector.getAllAndOverride<boolean>(SKIP_GLOBAL_RATE_LIMIT, targets)) {
      names.push(GLOBAL_RATE_LIMIT);
    }
    const routePolicy = this.reflector.getAllAndOverride<RateLimitPolicyName>(
      RATE_LIMIT_POLICY,
      targets,
    );
    if (routePolicy) names.push(routePolicy);

    const http = context.switchToHttp();
    const req = http.getRequest<TrackedRequest>();
    for (const name of names) {
      const policy: RateLimitPolicy = RATE_LIMIT_POLICIES[name as keyof typeof RATE_LIMIT_POLICIES];
      const result = await this.hit(rateLimitKey(name, policy, req), policy);
      if (result.blocked) {
        http.getResponse<Response>().setHeader('Retry-After', toSeconds(result.retryAfterMs));
        throw new AppException(HttpStatus.TOO_MANY_REQUESTS, 'rate_limited', 'Too many requests');
      }
    }
    return true;
  }

  private async hit(key: string, policy: RateLimitPolicy): Promise<RateLimitHit> {
    try {
      return await this.storage.hit(key, policy.ttl, policy.limit);
    } catch (error) {
      this.logger.error(
        { err: error instanceof Error ? { message: error.message } : error },
        'Rate limit storage is unavailable',
      );
      throw new AppException(
        HttpStatus.SERVICE_UNAVAILABLE,
        'service_unavailable',
        'Service is temporarily unavailable',
      );
    }
  }
}
