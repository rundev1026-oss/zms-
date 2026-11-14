-- Consolidate RegistryStatus to the 4 canonical statuses:
-- DRAFT, UNDER_REVIEW, QUALIFIED, NOT_QUALIFIED
-- Preserves all beneficiary and registry_status_histories records using deterministic legacy mapping.

DROP INDEX IF EXISTS "beneficiaries_thai_national_id_active_key";

CREATE TYPE "RegistryStatus_new" AS ENUM ('DRAFT', 'UNDER_REVIEW', 'QUALIFIED', 'NOT_QUALIFIED');

ALTER TABLE "beneficiaries" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "beneficiaries"
ALTER COLUMN "status" TYPE "RegistryStatus_new"
USING (
  CASE "status"::text
    WHEN 'DRAFT' THEN 'DRAFT'
    WHEN 'NEEDS_CORRECTION' THEN 'DRAFT'
    WHEN 'PENDING_REVIEW' THEN 'UNDER_REVIEW'
    WHEN 'UNDER_ASSESSMENT' THEN 'UNDER_REVIEW'
    WHEN 'ELIGIBLE' THEN 'QUALIFIED'
    WHEN 'INELIGIBLE' THEN 'NOT_QUALIFIED'
    WHEN 'SUSPENDED' THEN 'NOT_QUALIFIED'
    WHEN 'ARCHIVED' THEN 'NOT_QUALIFIED'
    ELSE 'UNDER_REVIEW'
  END
)::"RegistryStatus_new";

ALTER TABLE "registry_status_histories"
ALTER COLUMN "from_status" TYPE "RegistryStatus_new"
USING (
  CASE
    WHEN "from_status" IS NULL THEN NULL
    WHEN "from_status"::text IN ('DRAFT', 'NEEDS_CORRECTION') THEN 'DRAFT'::"RegistryStatus_new"
    WHEN "from_status"::text IN ('PENDING_REVIEW', 'UNDER_ASSESSMENT') THEN 'UNDER_REVIEW'::"RegistryStatus_new"
    WHEN "from_status"::text = 'ELIGIBLE' THEN 'QUALIFIED'::"RegistryStatus_new"
    ELSE 'NOT_QUALIFIED'::"RegistryStatus_new"
  END
),
ALTER COLUMN "to_status" TYPE "RegistryStatus_new"
USING (
  CASE "to_status"::text
    WHEN 'DRAFT' THEN 'DRAFT'::"RegistryStatus_new"
    WHEN 'NEEDS_CORRECTION' THEN 'DRAFT'::"RegistryStatus_new"
    WHEN 'PENDING_REVIEW' THEN 'UNDER_REVIEW'::"RegistryStatus_new"
    WHEN 'UNDER_ASSESSMENT' THEN 'UNDER_REVIEW'::"RegistryStatus_new"
    WHEN 'ELIGIBLE' THEN 'QUALIFIED'::"RegistryStatus_new"
    ELSE 'NOT_QUALIFIED'::"RegistryStatus_new"
  END
);

DROP TYPE "RegistryStatus";
ALTER TYPE "RegistryStatus_new" RENAME TO "RegistryStatus";

ALTER TABLE "beneficiaries" ALTER COLUMN "status" SET DEFAULT 'DRAFT'::"RegistryStatus";

CREATE UNIQUE INDEX "beneficiaries_thai_national_id_active_key"
ON "beneficiaries"("identity_number_normalized")
WHERE "identity_type" = 'THAI_NATIONAL_ID'::"IdentityType"
  AND "deleted_at" IS NULL
  AND "member_status" <> 'ARCHIVED'
  AND "identity_number_normalized" IS NOT NULL;
