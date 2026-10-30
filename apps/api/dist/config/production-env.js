"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RESTORE_CONFIRMATION = exports.SYSTEM_SEED_CONFIRMATION = void 0;
exports.productionEnvIssues = productionEnvIssues;
exports.assertProductionEnvironment = assertProductionEnvironment;
exports.assertSystemSeedAllowed = assertSystemSeedAllowed;
exports.staffSeedAction = staffSeedAction;
exports.trustProxyHops = trustProxyHops;
exports.swaggerEnabled = swaggerEnabled;
const node_path_1 = __importDefault(require("node:path"));
const EXAMPLE_JWT = 'dev-only-access-secret-change-me';
const TEST_JWT = 'test-only-access-secret';
const EXAMPLE_DATABASE_USER = '://zms:zms@';
const EXAMPLE_SEED_PASSWORD = 'LocalDev-Only-1';
exports.SYSTEM_SEED_CONFIRMATION = 'apply-system-seed';
exports.RESTORE_CONFIRMATION = 'restore-database';
function productionEnvIssues(env) {
    if (env.NODE_ENV !== 'production') {
        return [];
    }
    const issues = [];
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
    if (!node_path_1.default.isAbsolute(env.STORAGE_DIR ?? '')) {
        issues.push('STORAGE_DIR');
    }
    if (env.SEED_USER_PASSWORD === EXAMPLE_SEED_PASSWORD) {
        issues.push('SEED_USER_PASSWORD');
    }
    return issues;
}
function assertProductionEnvironment(env) {
    const issues = productionEnvIssues(env);
    if (issues.length === 0) {
        return;
    }
    throw new Error(`Production environment is incomplete: ${issues.join(', ')}`);
}
function assertSystemSeedAllowed(env) {
    const password = env.SEED_USER_PASSWORD ?? '';
    if (env.NODE_ENV !== 'production') {
        if (password.length === 0) {
            throw new Error('SEED_USER_PASSWORD is required. Set it in the environment before seeding.');
        }
        return;
    }
    if (env.ZMS_CONFIRM_SYSTEM_SEED !== exports.SYSTEM_SEED_CONFIRMATION) {
        throw new Error('Refusing system seed in production. It rewrites the role permission matrix and creates missing staff accounts. It does not delete beneficiary records. Set ZMS_CONFIRM_SYSTEM_SEED=apply-system-seed to continue.');
    }
    if (password.length < 12 || password === EXAMPLE_SEED_PASSWORD) {
        throw new Error('SEED_USER_PASSWORD must be a non-example value of at least 12 characters.');
    }
    assertProductionEnvironment(env);
}
function staffSeedAction(nodeEnv, accountExists) {
    if (!accountExists) {
        return 'create';
    }
    return nodeEnv === 'production' ? 'keep' : 'reset';
}
function trustProxyHops(env) {
    if (env.NODE_ENV !== 'production' || env.TRUST_PROXY === '0') {
        return false;
    }
    return 1;
}
function swaggerEnabled(env) {
    if (env.ENABLE_SWAGGER === 'true') {
        return true;
    }
    return env.NODE_ENV !== 'production';
}
function isHttpsOrigin(value) {
    if (value === '*' || value.length === 0) {
        return false;
    }
    try {
        const url = new URL(value);
        return url.protocol === 'https:' && url.origin === value;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=production-env.js.map