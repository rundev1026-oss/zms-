import path from 'node:path';
import {
  assertProductionEnvironment,
  assertSystemSeedAllowed,
  productionEnvIssues,
  staffSeedAction,
  swaggerEnabled,
  trustProxyHops,
} from './production-env';

const production = {
  NODE_ENV: 'production',
  JWT_ACCESS_SECRET: 'a-real-random-secret-that-is-long-enough',
  DATABASE_URL: 'postgresql://zms_app:change-this-password@db.internal:5432/zms?schema=public',
  WEB_ORIGIN: 'https://zms.example',
  STORAGE_DIR: path.join(path.parse(process.cwd()).root, 'zms', 'storage'),
  SEED_USER_PASSWORD: 'a-different-staff-password',
  ZMS_CONFIRM_SYSTEM_SEED: 'apply-system-seed',
};

describe('production environment', () => {
  it('accepts a complete production environment without echoing values', () => {
    expect(productionEnvIssues(production)).toEqual([]);
    expect(() => assertProductionEnvironment(production)).not.toThrow();
  });

  it('rejects example secrets and a non-https origin by variable name only', () => {
    expect(() =>
      assertProductionEnvironment({
        NODE_ENV: 'production',
        JWT_ACCESS_SECRET: 'dev-only-access-secret-change-me',
        DATABASE_URL: 'postgresql://zms:zms@localhost:5432/zms',
        WEB_ORIGIN: 'http://localhost:5173',
        STORAGE_DIR: 'storage',
        SEED_USER_PASSWORD: 'LocalDev-Only-1',
      }),
    ).toThrow(
      'Production environment is incomplete: JWT_ACCESS_SECRET, DATABASE_URL, WEB_ORIGIN, STORAGE_DIR, SEED_USER_PASSWORD',
    );
  });

  it('leaves development defaults usable', () => {
    expect(
      productionEnvIssues({
        NODE_ENV: 'development',
        JWT_ACCESS_SECRET: 'dev-only-access-secret-change-me',
        DATABASE_URL: 'postgresql://zms:zms@localhost:5432/zms',
      }),
    ).toEqual([]);
  });

  it('refuses a production seed until the confirmation value is set', () => {
    expect(() =>
      assertSystemSeedAllowed({ ...production, ZMS_CONFIRM_SYSTEM_SEED: undefined }),
    ).toThrow(/Refusing system seed/);
    expect(() => assertSystemSeedAllowed(production)).not.toThrow();
  });

  it('keeps an existing production account and still resets a development account', () => {
    expect(staffSeedAction('production', true)).toBe('keep');
    expect(staffSeedAction('production', false)).toBe('create');
    expect(staffSeedAction('development', true)).toBe('reset');
  });

  it('hides Swagger and trusts one proxy hop only in production', () => {
    expect(swaggerEnabled({ NODE_ENV: 'production' })).toBe(false);
    expect(swaggerEnabled({ NODE_ENV: 'production', ENABLE_SWAGGER: 'true' })).toBe(true);
    expect(swaggerEnabled({ NODE_ENV: 'development' })).toBe(true);
    expect(trustProxyHops({ NODE_ENV: 'production' })).toBe(1);
    expect(trustProxyHops({ NODE_ENV: 'production', TRUST_PROXY: '0' })).toBe(false);
    expect(trustProxyHops({ NODE_ENV: 'development' })).toBe(false);
  });
});
