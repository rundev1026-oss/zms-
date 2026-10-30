import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

function readMigrations(): string {
  const root = join(__dirname, '../../prisma/migrations');
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => readFileSync(join(root, entry.name, 'migration.sql'), 'utf8'))
    .join('\n');
}

describe('domain migration contract', () => {
  const sql = readMigrations();

  it('creates the registry tables and keeps money as decimal', () => {
    for (const table of [
      'users',
      'roles',
      'permissions',
      'user_roles',
      'role_permissions',
      'refresh_tokens',
      'beneficiaries',
      'beneficiary_addresses',
      'households',
      'household_members',
      'income_expense_profiles',
      'asnaf_categories',
      'beneficiary_asnaf_assessments',
      'beneficiary_documents',
      'registry_status_histories',
      'consent_records',
      'audit_logs',
      'registry_counters',
    ]) {
      expect(sql).toContain(`CREATE TABLE "${table}"`);
    }

    expect(sql).toContain('"household_income" DECIMAL(14,2)');
    expect(sql).toContain('"personal_income" DECIMAL(14,2)');
    expect(sql).not.toContain('InfrastructureCheck');
    expect(sql.toLowerCase()).not.toContain('public_url');
  });

  it('adds the partial unique index for active Thai national IDs', () => {
    expect(sql).toContain('"beneficiaries_thai_national_id_active_key"');
    expect(sql).toContain('"identity_type" = \'THAI_NATIONAL_ID\'::"IdentityType"');
    expect(sql).toContain('"deleted_at" IS NULL');
    expect(sql).toContain('"status" <> \'ARCHIVED\'::"RegistryStatus"');
  });
});
