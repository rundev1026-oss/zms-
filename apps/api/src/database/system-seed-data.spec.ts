import {
  ASNAF_CATEGORIES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  ROLES,
  SEED_USERS,
} from './system-seed-data';

describe('system seed data', () => {
  it('seeds categories, roles, and permissions without personal records', () => {
    expect(ASNAF_CATEGORIES.map((category) => category.code)).toEqual([
      'FAQIR',
      'MISKIN',
      'AMIL',
      'MUALLAF',
      'GHARIM',
      'FISABILILLAH',
      'IBNUS_SABIL',
      'OTHER',
    ]);
    expect(ROLES).toHaveLength(7);
    expect(PERMISSIONS).toHaveLength(98);
    expect(SEED_USERS.every((user) => user.email.endsWith('@zms.local'))).toBe(true);
    expect(JSON.stringify(SEED_USERS)).not.toMatch(/\d{13}/);
  });

  it('gives every permission to the system administrator and no unknown codes', () => {
    const codes = new Set(PERMISSIONS.map((permission) => permission.code));
    expect(ROLE_PERMISSIONS.SUPER_ADMIN).toEqual(PERMISSIONS.map((permission) => permission.code));
    expect(ROLE_PERMISSIONS.REGISTRAR).not.toContain('beneficiaries.decide');
    expect(ROLE_PERMISSIONS.REVIEWER).not.toContain('beneficiaries.decide');
    expect(ROLE_PERMISSIONS.ASSESSOR).not.toContain('beneficiaries.decide');
    expect(ROLE_PERMISSIONS.APPROVER).toEqual([
      'beneficiaries.read',
      'beneficiaries.read.sensitive',
      'beneficiaries.decide',
    ]);

    for (const granted of Object.values(ROLE_PERMISSIONS)) {
      for (const code of granted) {
        expect(codes.has(code)).toBe(true);
      }
    }
  });
});
