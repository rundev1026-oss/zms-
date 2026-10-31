-- AlterTable
ALTER TABLE "beneficiaries" ADD COLUMN IF NOT EXISTS "deleted_by_id" UUID,
ADD COLUMN IF NOT EXISTS "deletion_reason" TEXT,
ADD COLUMN IF NOT EXISTS "deletion_reference" TEXT,
ADD COLUMN IF NOT EXISTS "deletion_status" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "beneficiaries_deletion_status_idx" ON "beneficiaries"("deletion_status");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'beneficiaries_deleted_by_id_fkey'
    ) THEN
        ALTER TABLE "beneficiaries" ADD CONSTRAINT "beneficiaries_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
