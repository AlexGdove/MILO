-- Этап 9: два Telegram-бота (B-18). SQL сгенерирован `prisma migrate diff`.
-- Номера обновлений у каждого бота свои — дедупликация по паре (бот, номер); прежние строки
-- относятся к боту поддержки (значение по умолчанию). У события outbox — время следующей
-- попытки: после ошибки пауза растёт.

-- CreateEnum
CREATE TYPE "telegram_bot" AS ENUM ('support', 'moderation');

-- AlterTable
ALTER TABLE "outbox_events" ADD COLUMN     "available_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "telegram_updates" DROP CONSTRAINT "telegram_updates_pkey",
ADD COLUMN     "bot" "telegram_bot" NOT NULL DEFAULT 'support',
ADD CONSTRAINT "telegram_updates_pkey" PRIMARY KEY ("bot", "update_id");
