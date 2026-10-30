import path from 'node:path';

const EXAMPLE_JWT = 'dev-only-access-secret-change-me';
const TEST_JWT = 'test-only-access-secret';
const EXAMPLE_DATABASE_USER = '://zms:zms@';
const EXAMPLE_SEED_PASSWORD = 'LocalDev-Only-1';

export const SYSTEM_SEED_CONFIRMATION = 'apply-system-seed';
export const RESTORE_CONFIRMATION = 'restore-database';

export type StaffSeedAction = 'create' | 'reset' | 'keep';

export function productionEnvIssues(env: NodeJS.ProcessEnv): string[] {
  if (env.NODE_ENV !== 'production') {
    return [];
  }

  const issues: string[] = [];
  const secret = env.JWT_ACCESS_SECRET ?? '';
  if (secret.length < 32 || secret === EXAMPLE_JWT || secret === TEST_JWT) {
    issues.push('JWT_ACCESS_SECRET');
  }

  const databaseUrl = env.DATABASE_URL ?? '';
  if (databaseUrl.length === 0 || databaseUrl.includes(EXAMPLE_DATABASE_USER)) {
    issues.push('DATABASE_URL');
  }

  if (!isHttpsOrigin(env.WEB_ORIGIN ?? '')) {
    issues.push('WEB_ORIGIN');
  }

  if (!path.isAbsolute(env.STORAGE_DIR ?? '')) {
    issues.push('STORAGE_DIR');
  }

  if (env.SEED_USER_PASSWORD === EXAMPLE_SEED_PASSWORD) {
    issues.push('SEED_USER_PASSWORD');
  }

  return issues;
}

export function assertProductionEnvironment(env: NodeJS.ProcessEnv): void {
  const issues = productionEnvIssues(env);
  if (issues.length === 0) {
    return;
  }
  throw new Error(`Production environment is incomplete: ${issues.join(', ')}`);
}

export function assertSystemSeedAllowed(env: NodeJS.ProcessEnv): void {
  const password = env.SEED_USER_PASSWORD ?? '';
  if (env.NODE_ENV !== 'production') {
    if (password.length === 0) {
      throw new Error('SEED_USER_PASSWORD is required. Set it in the environment before seeding.');
    }
    return;
  }

  if (env.ZMS_CONFIRM_SYSTEM_SEED !== SYSTEM_SEED_CONFIRMATION) {
    throw new Error(
      'Refusing system seed in production. It rewrites the role permission matrix and creates missing staff accounts. It does not delete beneficiary records. Set ZMS_CONFIRM_SYSTEM_SEED=apply-system-seed to continue.',
    );
  }

  if (password.length < 12 || password === EXAMPLE_SEED_PASSWORD) {
    throw new Error('SEED_USER_PASSWORD must be a non-example value of at least 12 characters.');
  }

  assertProductionEnvironment(env);
}

export function staffSeedAction(
  nodeEnv: string | undefined,
  accountExists: boolean,
): StaffSeedAction {
  if (!accountExists) {
    return 'create';
  }
  return nodeEnv === 'production' ? 'keep' : 'reset';
}

export function trustProxyHops(env: NodeJS.ProcessEnv): number | false {
  if (env.NODE_ENV !== 'production' || env.TRUST_PROXY === '0') {
    return false;
  }
  return 1;
}

export function swaggerEnabled(env: NodeJS.ProcessEnv): boolean {
  if (env.ENABLE_SWAGGER === 'true') {
    return true;
  }
  return env.NODE_ENV !== 'production';
}

function isHttpsOrigin(value: string): boolean {
  if (value === '*' || value.length === 0) {
    return false;
  }
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.origin === value;
  } catch {
    return false;
  }
}
