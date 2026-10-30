-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "RegistryStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'NEEDS_CORRECTION', 'UNDER_ASSESSMENT', 'ELIGIBLE', 'INELIGIBLE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "IdentityType" AS ENUM ('THAI_NATIONAL_ID', 'OTHER');

-- CreateEnum
CREATE TYPE "AddressType" AS ENUM ('REGISTERED', 'CURRENT');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('UPLOADED', 'ACCEPTED', 'REJECTED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "AsnafDecision" AS ENUM ('PROPOSED', 'CONFIRMED', 'NOT_CONFIRMED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beneficiaries" (
    "id" UUID NOT NULL,
    "registry_number" TEXT NOT NULL,
    "status" "RegistryStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "identity_type" "IdentityType" NOT NULL,
    "identity_number" TEXT,
    "identity_number_normalized" TEXT,
    "date_of_birth" DATE,
    "phone" TEXT,
    "occupation" TEXT,
    "marital_status" TEXT,
    "registration_note" TEXT,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by_id" UUID,
    "updated_by_id" UUID,

    CONSTRAINT "beneficiaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beneficiary_addresses" (
    "id" UUID NOT NULL,
    "beneficiary_id" UUID NOT NULL,
    "address_type" "AddressType" NOT NULL,
    "address_line" TEXT,
    "community" TEXT,
    "subdistrict" TEXT,
    "district" TEXT,
    "province" TEXT,
    "postal_code" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by_id" UUID,
    "updated_by_id" UUID,

    CONSTRAINT "beneficiary_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "households" (
    "id" UUID NOT NULL,
    "beneficiary_id" UUID NOT NULL,
    "member_count" INTEGER,
    "household_income" DECIMAL(14,2),
    "household_expense" DECIMAL(14,2),
    "debt_amount" DECIMAL(14,2),
    "dependent_count" INTEGER,
    "additional_notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by_id" UUID,
    "updated_by_id" UUID,

    CONSTRAINT "households_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "household_members" (
    "id" UUID NOT NULL,
    "household_id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "date_of_birth" DATE,
    "age_years" INTEGER,
    "occupation" TEXT,
    "is_dependent" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by_id" UUID,
    "updated_by_id" UUID,

    CONSTRAINT "household_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "income_expense_profiles" (
    "id" UUID NOT NULL,
    "beneficiary_id" UUID NOT NULL,
    "personal_income" DECIMAL(14,2),
    "regular_expense" DECIMAL(14,2),
    "debt_burden" DECIMAL(14,2),
    "housing_condition" TEXT,
    "living_constraints" TEXT,
    "assistance_needs" TEXT,
    "other_agency_assistance" TEXT,
    "prior_assistance_history" TEXT,
    "officer_note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by_id" UUID,
    "updated_by_id" UUID,

    CONSTRAINT "income_expense_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asnaf_categories" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name_th" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "asnaf_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beneficiary_asnaf_assessments" (
    "id" UUID NOT NULL,
    "beneficiary_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "rationale" TEXT NOT NULL,
    "supporting_info" TEXT,
    "recorded_by_id" UUID,
    "assessed_at" TIMESTAMPTZ(6) NOT NULL,
    "reviewed_by_id" UUID,
    "decision" "AsnafDecision" NOT NULL DEFAULT 'PROPOSED',
    "reviewer_note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "beneficiary_asnaf_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beneficiary_documents" (
    "id" UUID NOT NULL,
    "beneficiary_id" UUID NOT NULL,
    "document_type" TEXT NOT NULL,
    "original_file_name" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'UPLOADED',
    "uploaded_by_id" UUID,
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "review_note" TEXT,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "beneficiary_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registry_status_histories" (
    "id" UUID NOT NULL,
    "beneficiary_id" UUID NOT NULL,
    "from_status" "RegistryStatus",
    "to_status" "RegistryStatus" NOT NULL,
    "reason" TEXT,
    "acted_by_id" UUID,
    "acted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registry_status_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_records" (
    "id" UUID NOT NULL,
    "beneficiary_id" UUID NOT NULL,
    "consent_text_version" TEXT NOT NULL,
    "privacy_notice_version" TEXT NOT NULL,
    "accepted" BOOLEAN NOT NULL,
    "channel" TEXT,
    "recorded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recorded_by_id" UUID,

    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_id" UUID,
    "action" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE INDEX "user_roles_role_id_idx" ON "user_roles"("role_id");

-- CreateIndex
CREATE INDEX "role_permissions_permission_id_idx" ON "role_permissions"("permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "beneficiaries_registry_number_key" ON "beneficiaries"("registry_number");

-- CreateIndex
CREATE INDEX "beneficiaries_status_idx" ON "beneficiaries"("status");

-- CreateIndex
CREATE INDEX "beneficiaries_deleted_at_idx" ON "beneficiaries"("deleted_at");

-- CreateIndex
CREATE INDEX "beneficiaries_status_deleted_at_idx" ON "beneficiaries"("status", "deleted_at");

-- CreateIndex
CREATE INDEX "beneficiaries_last_name_first_name_idx" ON "beneficiaries"("last_name", "first_name");

-- CreateIndex
CREATE INDEX "beneficiaries_phone_idx" ON "beneficiaries"("phone");

-- CreateIndex
CREATE INDEX "beneficiaries_identity_number_normalized_idx" ON "beneficiaries"("identity_number_normalized");

-- CreateIndex
CREATE INDEX "beneficiary_addresses_province_idx" ON "beneficiary_addresses"("province");

-- CreateIndex
CREATE INDEX "beneficiary_addresses_community_idx" ON "beneficiary_addresses"("community");

-- CreateIndex
CREATE UNIQUE INDEX "beneficiary_addresses_beneficiary_id_address_type_key" ON "beneficiary_addresses"("beneficiary_id", "address_type");

-- CreateIndex
CREATE UNIQUE INDEX "households_beneficiary_id_key" ON "households"("beneficiary_id");

-- CreateIndex
CREATE INDEX "household_members_household_id_idx" ON "household_members"("household_id");

-- CreateIndex
CREATE UNIQUE INDEX "income_expense_profiles_beneficiary_id_key" ON "income_expense_profiles"("beneficiary_id");

-- CreateIndex
CREATE UNIQUE INDEX "asnaf_categories_code_key" ON "asnaf_categories"("code");

-- CreateIndex
CREATE INDEX "asnaf_categories_is_active_sort_order_idx" ON "asnaf_categories"("is_active", "sort_order");

-- CreateIndex
CREATE INDEX "beneficiary_asnaf_assessments_beneficiary_id_decision_idx" ON "beneficiary_asnaf_assessments"("beneficiary_id", "decision");

-- CreateIndex
CREATE INDEX "beneficiary_asnaf_assessments_beneficiary_id_assessed_at_idx" ON "beneficiary_asnaf_assessments"("beneficiary_id", "assessed_at");

-- CreateIndex
CREATE INDEX "beneficiary_asnaf_assessments_category_id_idx" ON "beneficiary_asnaf_assessments"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "beneficiary_documents_storage_key_key" ON "beneficiary_documents"("storage_key");

-- CreateIndex
CREATE INDEX "beneficiary_documents_beneficiary_id_deleted_at_idx" ON "beneficiary_documents"("beneficiary_id", "deleted_at");

-- CreateIndex
CREATE INDEX "beneficiary_documents_status_idx" ON "beneficiary_documents"("status");

-- CreateIndex
CREATE INDEX "registry_status_histories_beneficiary_id_acted_at_idx" ON "registry_status_histories"("beneficiary_id", "acted_at");

-- CreateIndex
CREATE INDEX "consent_records_beneficiary_id_recorded_at_idx" ON "consent_records"("beneficiary_id", "recorded_at");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_created_at_idx" ON "audit_logs"("actor_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_resource_type_resource_id_idx" ON "audit_logs"("resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficiaries" ADD CONSTRAINT "beneficiaries_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficiaries" ADD CONSTRAINT "beneficiaries_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficiary_addresses" ADD CONSTRAINT "beneficiary_addresses_beneficiary_id_fkey" FOREIGN KEY ("beneficiary_id") REFERENCES "beneficiaries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficiary_addresses" ADD CONSTRAINT "beneficiary_addresses_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficiary_addresses" ADD CONSTRAINT "beneficiary_addresses_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "households" ADD CONSTRAINT "households_beneficiary_id_fkey" FOREIGN KEY ("beneficiary_id") REFERENCES "beneficiaries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "households" ADD CONSTRAINT "households_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "households" ADD CONSTRAINT "households_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "household_members" ADD CONSTRAINT "household_members_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "household_members" ADD CONSTRAINT "household_members_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "household_members" ADD CONSTRAINT "household_members_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income_expense_profiles" ADD CONSTRAINT "income_expense_profiles_beneficiary_id_fkey" FOREIGN KEY ("beneficiary_id") REFERENCES "beneficiaries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income_expense_profiles" ADD CONSTRAINT "income_expense_profiles_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income_expense_profiles" ADD CONSTRAINT "income_expense_profiles_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficiary_asnaf_assessments" ADD CONSTRAINT "beneficiary_asnaf_assessments_beneficiary_id_fkey" FOREIGN KEY ("beneficiary_id") REFERENCES "beneficiaries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficiary_asnaf_assessments" ADD CONSTRAINT "beneficiary_asnaf_assessments_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "asnaf_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficiary_asnaf_assessments" ADD CONSTRAINT "beneficiary_asnaf_assessments_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficiary_asnaf_assessments" ADD CONSTRAINT "beneficiary_asnaf_assessments_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficiary_documents" ADD CONSTRAINT "beneficiary_documents_beneficiary_id_fkey" FOREIGN KEY ("beneficiary_id") REFERENCES "beneficiaries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficiary_documents" ADD CONSTRAINT "beneficiary_documents_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficiary_documents" ADD CONSTRAINT "beneficiary_documents_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registry_status_histories" ADD CONSTRAINT "registry_status_histories_beneficiary_id_fkey" FOREIGN KEY ("beneficiary_id") REFERENCES "beneficiaries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registry_status_histories" ADD CONSTRAINT "registry_status_histories_acted_by_id_fkey" FOREIGN KEY ("acted_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_beneficiary_id_fkey" FOREIGN KEY ("beneficiary_id") REFERENCES "beneficiaries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Partial unique index. Prisma 6 cannot model this predicate.
-- Active Thai national IDs must not repeat. Archived and soft-deleted rows are excluded.
CREATE UNIQUE INDEX "beneficiaries_thai_national_id_active_key"
ON "beneficiaries" ("identity_number_normalized")
WHERE "identity_type" = 'THAI_NATIONAL_ID'::"IdentityType"
  AND "deleted_at" IS NULL
  AND "status" <> 'ARCHIVED'::"RegistryStatus"
  AND "identity_number_normalized" IS NOT NULL;
