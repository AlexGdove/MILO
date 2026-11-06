import type { RedisService } from '../../src/redis/redis.service.js';

/**
 * Пустая тестовая база Redis: счётчики лимитов не переходят между тестами. База 0
 * (разработка) сюда не попадёт — global-setup.js запрещает её для тестов.
 */
export async function resetRedis(redis: RedisService): Promise<void> {
  await redis.flushdb();
}
