-- Дописано вручную: триграммы для поиска рецептов по подстроке названия (индекс ниже)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateEnum
CREATE TYPE "unit" AS ENUM ('g', 'ml', 'pcs');

-- CreateEnum
CREATE TYPE "recipe_status" AS ENUM ('published', 'hidden');

-- CreateEnum
CREATE TYPE "report_reason" AS ENUM ('spam', 'offensive', 'not_food', 'other');

-- CreateEnum
CREATE TYPE "report_status" AS ENUM ('open', 'accepted', 'dismissed');

-- CreateEnum
CREATE TYPE "moderation_action" AS ENUM ('hide_recipe', 'restore_recipe', 'dismiss_reports', 'block_key', 'unblock_key');

-- CreateEnum
CREATE TYPE "ticket_status" AS ENUM ('open', 'answered', 'closed');

-- CreateEnum
CREATE TYPE "message_author" AS ENUM ('user', 'operator');

-- CreateTable
CREATE TABLE "device_keys" (
    "id" UUID NOT NULL,
    "key_hash" CHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ(6),
    "blocked_at" TIMESTAMPTZ(6),

    CONSTRAINT "device_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public_recipes" (
    "id" UUID NOT NULL,
    "author_key_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "servings" SMALLINT NOT NULL,
    "kcal_per_serving" DECIMAL(8,2) NOT NULL,
    "protein_per_serving" DECIMAL(8,2) NOT NULL,
    "fat_per_serving" DECIMAL(8,2) NOT NULL,
    "carbs_per_serving" DECIMAL(8,2) NOT NULL,
    "status" "recipe_status" NOT NULL DEFAULT 'published',
    "version" INTEGER NOT NULL DEFAULT 1,
    "published_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "public_recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public_recipe_ingredients" (
    "id" UUID NOT NULL,
    "recipe_id" UUID NOT NULL,
    "position" SMALLINT NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "unit" "unit" NOT NULL,
    "piece_weight" DECIMAL(8,2),
    "kcal" DECIMAL(6,2) NOT NULL,
    "protein" DECIMAL(6,2) NOT NULL,
    "fat" DECIMAL(6,2) NOT NULL,
    "carbs" DECIMAL(6,2) NOT NULL,

    CONSTRAINT "public_recipe_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_reports" (
    "id" UUID NOT NULL,
    "recipe_id" UUID NOT NULL,
    "reporter_key_id" UUID NOT NULL,
    "reason" "report_reason" NOT NULL,
    "comment" VARCHAR(500),
    "status" "report_status" NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ(6),

    CONSTRAINT "recipe_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operators" (
    "id" UUID NOT NULL,
    "telegram_user_id" BIGINT NOT NULL,
    "display_name" VARCHAR(64) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moderation_actions" (
    "id" UUID NOT NULL,
    "operator_id" UUID NOT NULL,
    "recipe_id" UUID,
    "device_key_id" UUID,
    "action" "moderation_action" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" UUID NOT NULL,
    "number" SERIAL NOT NULL,
    "device_key_id" UUID NOT NULL,
    "status" "ticket_status" NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_messages" (
    "id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "author" "message_author" NOT NULL,
    "operator_id" UUID,
    "text" VARCHAR(4000) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telegram_message_links" (
    "chat_id" BIGINT NOT NULL,
    "message_id" INTEGER NOT NULL,
    "ticket_id" UUID,
    "report_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_message_links_pkey" PRIMARY KEY ("chat_id","message_id")
);

-- CreateTable
CREATE TABLE "telegram_updates" (
    "update_id" BIGINT NOT NULL,
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_updates_pkey" PRIMARY KEY ("update_id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" UUID NOT NULL,
    "type" VARCHAR(64) NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ(6),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" VARCHAR(500),

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "device_key_id" UUID NOT NULL,
    "key" VARCHAR(64) NOT NULL,
    "request_hash" CHAR(64) NOT NULL,
    "status_code" SMALLINT NOT NULL,
    "response" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("device_key_id","key")
);

-- CreateIndex
CREATE UNIQUE INDEX "device_keys_key_hash_key" ON "device_keys"("key_hash");

-- CreateIndex
CREATE INDEX "public_recipes_status_published_at_id_idx" ON "public_recipes"("status", "published_at" DESC, "id");

-- CreateIndex
CREATE INDEX "public_recipes_author_key_id_idx" ON "public_recipes"("author_key_id");

-- CreateIndex
CREATE INDEX "public_recipes_name_trgm_idx" ON "public_recipes" USING GIN ("name" gin_trgm_ops);

-- CreateIndex
CREATE UNIQUE INDEX "public_recipe_ingredients_recipe_id_position_key" ON "public_recipe_ingredients"("recipe_id", "position");

-- CreateIndex
CREATE INDEX "recipe_reports_status_created_at_idx" ON "recipe_reports"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_reports_recipe_id_reporter_key_id_key" ON "recipe_reports"("recipe_id", "reporter_key_id");

-- CreateIndex
CREATE UNIQUE INDEX "operators_telegram_user_id_key" ON "operators"("telegram_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "support_tickets_number_key" ON "support_tickets"("number");

-- CreateIndex
CREATE INDEX "support_tickets_device_key_id_updated_at_idx" ON "support_tickets"("device_key_id", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "support_messages_ticket_id_created_at_id_idx" ON "support_messages"("ticket_id", "created_at", "id");

-- CreateIndex
CREATE INDEX "outbox_events_processed_at_created_at_idx" ON "outbox_events"("processed_at", "created_at");

-- AddForeignKey
ALTER TABLE "public_recipes" ADD CONSTRAINT "public_recipes_author_key_id_fkey" FOREIGN KEY ("author_key_id") REFERENCES "device_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_recipe_ingredients" ADD CONSTRAINT "public_recipe_ingredients_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "public_recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_reports" ADD CONSTRAINT "recipe_reports_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "public_recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_reports" ADD CONSTRAINT "recipe_reports_reporter_key_id_fkey" FOREIGN KEY ("reporter_key_id") REFERENCES "device_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "operators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "public_recipes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_device_key_id_fkey" FOREIGN KEY ("device_key_id") REFERENCES "device_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "operators"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telegram_message_links" ADD CONSTRAINT "telegram_message_links_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telegram_message_links" ADD CONSTRAINT "telegram_message_links_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "recipe_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_device_key_id_fkey" FOREIGN KEY ("device_key_id") REFERENCES "device_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Дописано вручную: CHECK-ограничения (docs/backend/database.md). Prisma их не описывает
-- и не отслеживает; база — последний рубеж, основная проверка — DTO на уровне API.

ALTER TABLE "public_recipes"
  ADD CONSTRAINT "public_recipes_name_check" CHECK (char_length(btrim("name")) BETWEEN 1 AND 120),
  ADD CONSTRAINT "public_recipes_servings_check" CHECK ("servings" BETWEEN 1 AND 100),
  ADD CONSTRAINT "public_recipes_version_check" CHECK ("version" >= 1),
  ADD CONSTRAINT "public_recipes_per_serving_check" CHECK (
    "kcal_per_serving" >= 0 AND "protein_per_serving" >= 0
    AND "fat_per_serving" >= 0 AND "carbs_per_serving" >= 0
  );

ALTER TABLE "public_recipe_ingredients"
  ADD CONSTRAINT "public_recipe_ingredients_position_check" CHECK ("position" BETWEEN 0 AND 49),
  ADD CONSTRAINT "public_recipe_ingredients_name_check" CHECK (char_length(btrim("name")) BETWEEN 1 AND 80),
  ADD CONSTRAINT "public_recipe_ingredients_amount_check" CHECK ("amount" > 0 AND "amount" <= 100000),
  -- Вес штуки обязателен для шт и запрещён для г/мл
  ADD CONSTRAINT "public_recipe_ingredients_piece_weight_check" CHECK (
    ("unit" = 'pcs' AND "piece_weight" > 0 AND "piece_weight" <= 5000)
    OR ("unit" <> 'pcs' AND "piece_weight" IS NULL)
  ),
  -- КБЖУ на 100 г
  ADD CONSTRAINT "public_recipe_ingredients_nutrients_check" CHECK (
    "kcal" BETWEEN 0 AND 900
    AND "protein" BETWEEN 0 AND 100 AND "fat" BETWEEN 0 AND 100 AND "carbs" BETWEEN 0 AND 100
    AND "protein" + "fat" + "carbs" <= 100
  );

ALTER TABLE "operators"
  ADD CONSTRAINT "operators_display_name_check" CHECK (char_length(btrim("display_name")) >= 1);

ALTER TABLE "support_messages"
  ADD CONSTRAINT "support_messages_text_check" CHECK (char_length(btrim("text")) >= 1),
  -- Сообщение пользователя не связано с оператором (у сообщения оператора связь может
  -- обнулиться при удалении оператора — ON DELETE SET NULL)
  ADD CONSTRAINT "support_messages_author_check" CHECK ("author" = 'operator' OR "operator_id" IS NULL);

ALTER TABLE "telegram_message_links"
  -- Ровно одно: обращение или жалоба
  ADD CONSTRAINT "telegram_message_links_target_check" CHECK (num_nonnulls("ticket_id", "report_id") = 1);

ALTER TABLE "outbox_events"
  ADD CONSTRAINT "outbox_events_attempts_check" CHECK ("attempts" >= 0);
