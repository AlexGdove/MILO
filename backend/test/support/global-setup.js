// Один раз перед e2e-тестами (Jest globalSetup). Обычный JS: Jest загружает этот файл
// напрямую через Node, без ts-jest и moduleNameMapper.
//  1. Выбирает тестовую базу и проверяет имя — тесты очищают таблицы, поэтому только *_test.
//  2. Передаёт её тестам через DATABASE_URL (процессы с тестами наследуют окружение).
//     Так же Redis: TEST_REDIS_URL (база ≥ 1) → REDIS_URL.
//  3. Применяет новые миграции (`prisma migrate deploy` — ничего не удаляет, как на сервере).
//     Данные между тестами очищает TRUNCATE в самих тестах (test/support/db.ts).
//     Если миграцию правили задним числом, тестовую базу пересоздаёт человек вручную.
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_TEST_DATABASE_URL = 'postgresql://milo:milo@localhost:5432/milo_test';
// Тесты очищают базу Redis (FLUSHDB), поэтому база 0 (разработка) запрещена
const DEFAULT_TEST_REDIS_URL = 'redis://localhost:6379/1';
const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** Номер базы Redis из адреса: redis://host:port/N (без номера — 0). */
function redisDbIndex(url) {
  const path = new URL(url).pathname.replace(/^\//, '');
  return path === '' ? 0 : Number(path);
}

export default function globalSetup() {
  const redisUrl = process.env.TEST_REDIS_URL ?? DEFAULT_TEST_REDIS_URL;
  const redisDb = redisDbIndex(redisUrl);
  if (!Number.isInteger(redisDb) || redisDb === 0) {
    throw new Error(`Refusing to run tests against Redis database ${redisDb}: use a database ≥ 1`);
  }
  process.env.REDIS_URL = redisUrl;

  const url = process.env.TEST_DATABASE_URL ?? DEFAULT_TEST_DATABASE_URL;
  const name = new URL(url).pathname.replace(/^\//, '');
  if (!name.endsWith('_test')) {
    throw new Error(`Refusing to run tests against database "${name}": name must end with _test`);
  }
  process.env.DATABASE_URL = url;

  const result = spawnSync('npx prisma migrate deploy', {
    cwd: backendRoot,
    env: process.env,
    shell: true,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(
      `Test database migration failed (is PostgreSQL running? npm run db:up)\n${result.stdout}\n${result.stderr}`,
    );
  }
}
