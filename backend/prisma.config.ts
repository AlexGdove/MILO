// Конфигурация Prisma CLI (Prisma 7): схема, миграции, URL базы.
// .env читается встроенным в Node `process.loadEnvFile` (без dotenv); переменные окружения
// процесса важнее файла. URL нужен только командам, работающим с базой (migrate, db).
import { defineConfig } from 'prisma/config';

try {
  process.loadEnvFile('.env');
} catch {
  // .env необязателен: в CI и тестах URL приходит из окружения
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: process.env.DATABASE_URL },
});
