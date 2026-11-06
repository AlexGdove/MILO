-- B-18: публичные рецепты заменяются общей базой продуктов с автомодерацией. Поддержка
-- остаётся на этом сервере (B-15 отменено). SQL сгенерирован `prisma migrate diff`;
-- блоки «Дописано вручную» — то, что Prisma не описывает.

-- Дописано вручную: журнал модерации рецептов и связи бота с жалобами теряют смысл вместе с
-- рецептами — удаляются до смены типов (иначе приведение enum и NOT NULL не применятся)
DELETE FROM "moderation_actions" WHERE "action"::text IN ('hide_recipe', 'restore_recipe', 'dismiss_reports');
ALTER TABLE "telegram_message_links" DROP CONSTRAINT "telegram_message_links_target_check";
DELETE FROM "telegram_message_links" WHERE "ticket_id" IS NULL;

-- CreateEnum
CREATE TYPE "submission_status" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "reviewed_by" AS ENUM ('auto', 'operator');

-- AlterEnum
BEGIN;
CREATE TYPE "moderation_action_new" AS ENUM ('approve_submission', 'reject_submission', 'block_key', 'unblock_key');
ALTER TABLE "moderation_actions" ALTER COLUMN "action" TYPE "moderation_action_new" USING ("action"::text::"moderation_action_new");
ALTER TYPE "moderation_action" RENAME TO "moderation_action_old";
ALTER TYPE "moderation_action_new" RENAME TO "moderation_action";
DROP TYPE "public"."moderation_action_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "moderation_actions" DROP CONSTRAINT "moderation_actions_recipe_id_fkey";

-- DropForeignKey
ALTER TABLE "public_recipe_ingredients" DROP CONSTRAINT "public_recipe_ingredients_recipe_id_fkey";

-- DropForeignKey
ALTER TABLE "public_recipes" DROP CONSTRAINT "public_recipes_author_key_id_fkey";

-- DropForeignKey
ALTER TABLE "recipe_reports" DROP CONSTRAINT "recipe_reports_recipe_id_fkey";

-- DropForeignKey
ALTER TABLE "recipe_reports" DROP CONSTRAINT "recipe_reports_reporter_key_id_fkey";

-- DropForeignKey
ALTER TABLE "telegram_message_links" DROP CONSTRAINT "telegram_message_links_report_id_fkey";

-- AlterTable
ALTER TABLE "moderation_actions" DROP COLUMN "recipe_id",
ADD COLUMN     "submission_id" UUID;

-- AlterTable
ALTER TABLE "telegram_message_links" DROP COLUMN "report_id",
ADD COLUMN     "submission_id" UUID;

-- DropTable
DROP TABLE "public_recipe_ingredients";

-- DropTable
DROP TABLE "public_recipes";

-- DropTable
DROP TABLE "recipe_reports";

-- DropEnum
DROP TYPE "recipe_status";

-- DropEnum
DROP TYPE "report_reason";

-- DropEnum
DROP TYPE "report_status";

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "brand" VARCHAR(80),
    "barcode" VARCHAR(14),
    "unit" "unit" NOT NULL,
    "piece_weight" DECIMAL(8,2),
    "kcal" DECIMAL(6,2) NOT NULL,
    "protein" DECIMAL(6,2) NOT NULL,
    "fat" DECIMAL(6,2) NOT NULL,
    "carbs" DECIMAL(6,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_submissions" (
    "id" UUID NOT NULL,
    "device_key_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "brand" VARCHAR(80),
    "barcode" VARCHAR(14),
    "unit" "unit" NOT NULL,
    "piece_weight" DECIMAL(8,2),
    "kcal" DECIMAL(6,2) NOT NULL,
    "protein" DECIMAL(6,2) NOT NULL,
    "fat" DECIMAL(6,2) NOT NULL,
    "carbs" DECIMAL(6,2) NOT NULL,
    "status" "submission_status" NOT NULL DEFAULT 'pending',
    "flags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reviewed_by" "reviewed_by",
    "reviewed_at" TIMESTAMPTZ(6),
    "product_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "product_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "products_barcode_key" ON "products"("barcode");

-- CreateIndex
CREATE INDEX "products_created_at_id_idx" ON "products"("created_at" DESC, "id");

-- CreateIndex
CREATE INDEX "products_name_trgm_idx" ON "products" USING GIN ("name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "product_submissions_device_key_id_created_at_id_idx" ON "product_submissions"("device_key_id", "created_at" DESC, "id");

-- CreateIndex
CREATE INDEX "product_submissions_status_created_at_idx" ON "product_submissions"("status", "created_at");

-- CreateIndex
CREATE INDEX "product_submissions_barcode_idx" ON "product_submissions"("barcode");

-- AddForeignKey
ALTER TABLE "product_submissions" ADD CONSTRAINT "product_submissions_device_key_id_fkey" FOREIGN KEY ("device_key_id") REFERENCES "device_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_submissions" ADD CONSTRAINT "product_submissions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "product_submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telegram_message_links" ADD CONSTRAINT "telegram_message_links_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "product_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Дописано вручную: CHECK-ограничения (docs/backend/database.md). Те же правила, что у
-- продукта кладовой во frontend и у DTO API
ALTER TABLE "products"
  ADD CONSTRAINT "products_name_check" CHECK (char_length(btrim("name")) BETWEEN 1 AND 120),
  ADD CONSTRAINT "products_brand_check" CHECK ("brand" IS NULL OR char_length(btrim("brand")) BETWEEN 1 AND 80),
  ADD CONSTRAINT "products_barcode_check" CHECK ("barcode" IS NULL OR "barcode" ~ '^([0-9]{8}|[0-9]{12,14})$'),
  ADD CONSTRAINT "products_piece_weight_check" CHECK (
    ("unit" = 'pcs' AND "piece_weight" IS NOT NULL AND "piece_weight" > 0 AND "piece_weight" <= 5000)
    OR ("unit" <> 'pcs' AND "piece_weight" IS NULL)
  ),
  ADD CONSTRAINT "products_nutrients_check" CHECK (
    "kcal" BETWEEN 0 AND 900
    AND "protein" BETWEEN 0 AND 100 AND "fat" BETWEEN 0 AND 100 AND "carbs" BETWEEN 0 AND 100
    AND "protein" + "fat" + "carbs" <= 100
  );

ALTER TABLE "product_submissions"
  ADD CONSTRAINT "product_submissions_name_check" CHECK (char_length(btrim("name")) BETWEEN 1 AND 120),
  ADD CONSTRAINT "product_submissions_brand_check" CHECK ("brand" IS NULL OR char_length(btrim("brand")) BETWEEN 1 AND 80),
  ADD CONSTRAINT "product_submissions_barcode_check" CHECK ("barcode" IS NULL OR "barcode" ~ '^([0-9]{8}|[0-9]{12,14})$'),
  ADD CONSTRAINT "product_submissions_piece_weight_check" CHECK (
    ("unit" = 'pcs' AND "piece_weight" IS NOT NULL AND "piece_weight" > 0 AND "piece_weight" <= 5000)
    OR ("unit" <> 'pcs' AND "piece_weight" IS NULL)
  ),
  ADD CONSTRAINT "product_submissions_nutrients_check" CHECK (
    "kcal" BETWEEN 0 AND 900
    AND "protein" BETWEEN 0 AND 100 AND "fat" BETWEEN 0 AND 100 AND "carbs" BETWEEN 0 AND 100
    AND "protein" + "fat" + "carbs" <= 100
  ),
  -- Решение есть у принятых и отклонённых, нет — у ожидающих; принятое связано с продуктом
  ADD CONSTRAINT "product_submissions_review_check" CHECK (
    ("status" = 'pending' AND "reviewed_by" IS NULL AND "reviewed_at" IS NULL)
    OR ("status" <> 'pending' AND "reviewed_by" IS NOT NULL AND "reviewed_at" IS NOT NULL)
  );

ALTER TABLE "telegram_message_links"
  -- Ровно одно: обращение (бот поддержки) или предложение продукта (бот модерации)
  ADD CONSTRAINT "telegram_message_links_target_check" CHECK (num_nonnulls("ticket_id", "submission_id") = 1);
