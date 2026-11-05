// Один раз перед e2e-тестами (Jest globalSetup). Обычный JS: Jest загружает этот файл
// напрямую через Node, без ts-jest и moduleNameMapper.
//  1. Выбирает тестовую базу и проверяет имя — тесты очищают таблицы, поэтому только *_test.
//  2. Передаёт её тестам через DATABASE_URL (процессы с тестами наследуют окружение).
//  3. Применяет новые миграции (`prisma migrate deploy` — ничего не удаляет, как на сервере).
//     Данные между тестами очищает TRUNCATE в самих тестах (test/support/db.ts).
//     Если миграцию правили задним числом, тестовую базу пересоздаёт человек вручную.
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_TEST_DATABASE_URL = 'postgresql://milo:milo@localhost:5432/milo_test';
const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export default function globalSetup() {
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
