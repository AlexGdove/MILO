-- Сбор ошибок приложения (решение №62). Одинаковые ошибки объединены по отпечатку.

-- CreateTable
CREATE TABLE "client_errors" (
    "id" UUID NOT NULL,
    "fingerprint" CHAR(64) NOT NULL,
    "kind" VARCHAR(20) NOT NULL,
    "message" VARCHAR(500) NOT NULL,
    "stack" VARCHAR(4000),
    "platform" VARCHAR(10) NOT NULL,
    "app_version" VARCHAR(16) NOT NULL,
    "route" VARCHAR(200),
    "user_agent" VARCHAR(300),
    "count" INTEGER NOT NULL DEFAULT 1,
    "first_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_errors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "client_errors_fingerprint_key" ON "client_errors"("fingerprint");

-- CreateIndex
CREATE INDEX "client_errors_last_seen_at_idx" ON "client_errors"("last_seen_at");
