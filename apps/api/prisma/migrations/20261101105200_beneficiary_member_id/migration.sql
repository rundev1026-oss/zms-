-- AlterTable
ALTER TABLE "beneficiaries" ADD COLUMN IF NOT EXISTS "member_id" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "member_counters" (
    "year" INTEGER NOT NULL,
    "last_value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "member_counters_pkey" PRIMARY KEY ("year")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "beneficiaries_member_id_key" ON "beneficiaries"("member_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "beneficiaries_member_id_idx" ON "beneficiaries"("member_id");

