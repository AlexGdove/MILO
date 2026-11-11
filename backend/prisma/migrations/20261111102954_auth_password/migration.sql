-- Вход по почте и паролю (решение №69): хэш пароля, подтверждение почты, назначение кода.
-- Аккаунты, созданные входом по коду (1.1.11–1.1.12), пароля не имеют и войти не смогут —
-- удаляются вместе с сессиями (каскад). На сервере вход по коду был выключен (503), там их нет.
-- Коды старого входа тоже не нужны: у кода теперь обязательно назначение.
DELETE FROM "accounts";
DELETE FROM "login_codes";
-- CreateEnum
CREATE TYPE "code_purpose" AS ENUM ('verify_email', 'reset_password');

-- DropIndex
DROP INDEX "login_codes_email_created_at_idx";

-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "email_verified_at" TIMESTAMPTZ(6),
ADD COLUMN     "password_hash" VARCHAR(200) NOT NULL;

-- AlterTable
ALTER TABLE "login_codes" ADD COLUMN     "purpose" "code_purpose" NOT NULL;

-- CreateIndex
CREATE INDEX "login_codes_email_purpose_created_at_idx" ON "login_codes"("email", "purpose", "created_at" DESC);
