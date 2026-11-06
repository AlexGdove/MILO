import { SetMetadata } from '@nestjs/common';

import type { RateLimitPolicyName } from './rate-limit.policies.js';

export const RATE_LIMIT_POLICY = 'milo:rate-limit-policy';
export const SKIP_GLOBAL_RATE_LIMIT = 'milo:skip-global-rate-limit';

/** Подключает к маршруту (или контроллеру) лимит действия из `RATE_LIMIT_POLICIES`. */
export const RateLimit = (policy: RateLimitPolicyName) => SetMetadata(RATE_LIMIT_POLICY, policy);

/** Маршрут без общего лимита — только для проверок живости (`/health`). */
export const SkipGlobalRateLimit = () => SetMetadata(SKIP_GLOBAL_RATE_LIMIT, true);
