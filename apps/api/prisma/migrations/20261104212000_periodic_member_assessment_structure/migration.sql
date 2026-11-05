-- AlterTable: Beneficiary separated member_status
ALTER TABLE "beneficiaries" ADD COLUMN IF NOT EXISTS "member_status" TEXT NOT NULL DEFAULT 'ACTIVE';

-- AlterTable: BeneficiaryAsnafAssessment periodic assessment & snapshot fields
ALTER TABLE "beneficiary_asnaf_assessments" ADD COLUMN IF NOT EXISTS "assessment_number" TEXT;
ALTER TABLE "beneficiary_asnaf_assessments" ADD COLUMN IF NOT EXISTS "assessment_period" TEXT;
ALTER TABLE "beneficiary_asnaf_assessments" ADD COLUMN IF NOT EXISTS "assessment_type" TEXT NOT NULL DEFAULT 'INITIAL';
ALTER TABLE "beneficiary_asnaf_assessments" ADD COLUMN IF NOT EXISTS "assessment_details" TEXT;
ALTER TABLE "beneficiary_asnaf_assessments" ADD COLUMN IF NOT EXISTS "eligibility_result" TEXT;
ALTER TABLE "beneficiary_asnaf_assessments" ADD COLUMN IF NOT EXISTS "recommendations" TEXT;
ALTER TABLE "beneficiary_asnaf_assessments" ADD COLUMN IF NOT EXISTS "next_assessment_date" DATE;
ALTER TABLE "beneficiary_asnaf_assessments" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'PENDING_ASSESSMENT';
ALTER TABLE "beneficiary_asnaf_assessments" ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMPTZ(6);
ALTER TABLE "beneficiary_asnaf_assessments" ADD COLUMN IF NOT EXISTS "checklist" JSONB;
ALTER TABLE "beneficiary_asnaf_assessments" ADD COLUMN IF NOT EXISTS "member_snapshot" JSONB;

-- CreateTable: AssessmentCounter (allocates ASM-YYYY-######)
CREATE TABLE IF NOT EXISTS "assessment_counters" (
    "year" INTEGER NOT NULL,
    "last_value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "assessment_counters_pkey" PRIMARY KEY ("year")
);

-- AlterTable: AssistanceApplication link to periodic assessment & creator
ALTER TABLE "assistance_applications" ADD COLUMN IF NOT EXISTS "assessment_id" UUID;
ALTER TABLE "assistance_applications" ADD COLUMN IF NOT EXISTS "created_by_id" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "beneficiaries_member_status_idx" ON "beneficiaries"("member_status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "beneficiary_asnaf_assessments_assessment_number_key" ON "beneficiary_asnaf_assessments"("assessment_number");
CREATE INDEX IF NOT EXISTS "beneficiary_asnaf_assessments_status_idx" ON "beneficiary_asnaf_assessments"("status");
CREATE INDEX IF NOT EXISTS "beneficiary_asnaf_assessments_eligibility_result_idx" ON "beneficiary_asnaf_assessments"("eligibility_result");
CREATE INDEX IF NOT EXISTS "beneficiary_asnaf_assessments_assessment_period_idx" ON "beneficiary_asnaf_assessments"("assessment_period");
CREATE INDEX IF NOT EXISTS "beneficiary_asnaf_assessments_next_assessment_date_idx" ON "beneficiary_asnaf_assessments"("next_assessment_date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "assistance_applications_assessment_id_idx" ON "assistance_applications"("assessment_id");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'assistance_applications_assessment_id_fkey'
    ) THEN
        ALTER TABLE "assistance_applications"
            ADD CONSTRAINT "assistance_applications_assessment_id_fkey"
            FOREIGN KEY ("assessment_id") REFERENCES "beneficiary_asnaf_assessments"("id")
            ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

