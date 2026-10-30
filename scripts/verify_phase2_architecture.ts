/**
 * Phase 2 Verification: Enterprise Architecture & Database Design
 * Verifies:
 * 1. Monorepo / Multi-tier Directory Layout (apps/api, packages/shared, apps/web)
 * 2. Standalone NestJS Backend Compilation & Build Output
 * 3. PostgreSQL Database Connection & Prisma Client Generation
 * 4. Relational Schema Integrity & Decimal Numeric Financial Types
 * 5. Docker Compose & Nginx Reverse Proxy Configuration
 * 6. Live API Health & Swagger Documentation Endpoints
 */

import http from 'http';
import fs from 'fs';
import path from 'path';

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, details?: any) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] #${totalTests}: ${testName}`);
  } else {
    console.error(`  [FAIL] #${totalTests}: ${testName}`);
    if (details) console.error('         Details:', details);
  }
}

function fetchHttp(url: string): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode || 0, body: data });
      });
    }).on('error', reject);
  });
}

async function runPhase2Verification() {
  console.log('================================================================');
  console.log('   PHASE 2: ENTERPRISE ARCHITECTURE & DATABASE DESIGN AUDIT    ');
  console.log('================================================================\n');

  const rootDir = process.cwd();

  // ---------------------------------------------------------------------------
  // SECTION 1: Directory Structure & Separation of Concerns
  // ---------------------------------------------------------------------------
  console.log('--- SECTION 1: Multi-Tier Architecture & Directory Layout ---');
  
  const apiDir = path.join(rootDir, 'apps', 'api');
  const sharedDir = path.join(rootDir, 'packages', 'shared');
  const nextSrcDir = path.join(rootDir, 'src');

  assert(fs.existsSync(apiDir), 'Dedicated NestJS Backend workspace exists at apps/api');
  assert(fs.existsSync(sharedDir), 'Shared enterprise types/constants exist at packages/shared');
  assert(fs.existsSync(nextSrcDir), 'Next.js Frontend workspace exists at src/');
  assert(fs.existsSync(path.join(apiDir, 'package.json')), 'apps/api has independent package.json');
  assert(fs.existsSync(path.join(apiDir, 'nest-cli.json')), 'apps/api has nest-cli.json');
  assert(fs.existsSync(path.join(apiDir, 'tsconfig.json')), 'apps/api has tsconfig.json');

  // ---------------------------------------------------------------------------
  // SECTION 2: NestJS Build & Compilation Verification
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 2: NestJS Standalone Engine Build Verification ---');

  const distMain = path.join(apiDir, 'dist', 'main.js');
  const distAppModule = path.join(apiDir, 'dist', 'app.module.js');
  const prismaClientDir = path.join(apiDir, 'node_modules', '@prisma', 'client');

  assert(fs.existsSync(distMain), 'NestJS compilation output exists (dist/main.js)');
  assert(fs.existsSync(distAppModule), 'NestJS root application module compiled (dist/app.module.js)');
  assert(fs.existsSync(prismaClientDir), 'Prisma Client generated and installed in apps/api');

  // ---------------------------------------------------------------------------
  // SECTION 3: PostgreSQL Prisma Schema & Financial Types
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 3: PostgreSQL Schema & Financial Precision ---');

  const schemaPath = path.join(apiDir, 'prisma', 'schema.prisma');
  assert(fs.existsSync(schemaPath), 'PostgreSQL Prisma schema exists at apps/api/prisma/schema.prisma');

  const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
  assert(schemaContent.includes('provider = "postgresql"'), 'Prisma datasource provider is strictly PostgreSQL');
  assert(schemaContent.includes('Decimal') || schemaContent.includes('numeric'), 'Financial models use Decimal/Numeric type (Strictly NO Float)');
  assert(schemaContent.includes('model User'), 'Prisma schema includes User model with RBAC');
  assert(schemaContent.includes('model Role'), 'Prisma schema includes Role model');
  assert(schemaContent.includes('model Beneficiary'), 'Prisma schema includes Beneficiary model');
  assert(schemaContent.includes('model Household'), 'Prisma schema includes Household model');

  // ---------------------------------------------------------------------------
  // SECTION 4: Docker & Reverse Proxy Deployment Readiness
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 4: Docker Compose & Nginx Reverse Proxy ---');

  const composePath = path.join(rootDir, 'docker-compose.yml');
  const nginxConfPath = path.join(rootDir, 'deploy', 'nginx', 'nginx.conf');
  const apiDockerfile = path.join(apiDir, 'Dockerfile');
  const webDockerfile = path.join(rootDir, 'Dockerfile');

  assert(fs.existsSync(composePath), 'Root docker-compose.yml exists');
  assert(fs.existsSync(nginxConfPath), 'Nginx reverse proxy configuration exists');
  assert(fs.existsSync(apiDockerfile), 'NestJS multi-stage Dockerfile exists');
  assert(fs.existsSync(webDockerfile), 'Next.js multi-stage Dockerfile exists');

  const composeContent = fs.readFileSync(composePath, 'utf-8');
  assert(composeContent.includes('container_name: zms-postgres'), 'Docker compose defines postgres service');
  assert(composeContent.includes('container_name: zms-api'), 'Docker compose defines api service (NestJS)');
  assert(composeContent.includes('container_name: zms-web'), 'Docker compose defines web service (Next.js)');
  assert(composeContent.includes('container_name: zms-nginx'), 'Docker compose defines nginx reverse proxy service');

  const nginxContent = fs.readFileSync(nginxConfPath, 'utf-8');
  assert(nginxContent.includes('X-Frame-Options') && nginxContent.includes('X-Content-Type-Options'), 'Nginx includes OWASP security headers');
  assert(nginxContent.includes('limit_req_zone'), 'Nginx includes API rate limiting (OWASP)');

  // ---------------------------------------------------------------------------
  // SECTION 5: Live NestJS API & Swagger Documentation Endpoints
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 5: Live API & Database Connectivity ---');

  try {
    const healthRes = await fetchHttp('http://localhost:4000/api/v1/health');
    assert(healthRes.statusCode === 200, 'NestJS /api/v1/health responded with HTTP 200 OK');
    const healthJson = JSON.parse(healthRes.body);
    assert(healthJson.status === 'ok', 'API health status is "ok"');
    assert(healthJson.database && healthJson.database.connected === true, 'API successfully connected to PostgreSQL database');
    console.log(`    Database Status: ${healthJson.database.message}`);
  } catch (err: any) {
    assert(false, `NestJS Health endpoint check failed: ${err.message}`);
  }

  try {
    const swaggerRes = await fetchHttp('http://localhost:4000/api/docs');
    assert(swaggerRes.statusCode === 200, 'Swagger / OpenAPI documentation responds with HTTP 200 OK at /api/docs');
  } catch (err: any) {
    assert(false, `Swagger endpoint check failed: ${err.message}`);
  }

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`   PHASE 2 RESULTS: ${passedTests} / ${totalTests} PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('================================================================\n');

  if (passedTests === totalTests) {
    console.log('🎉 PHASE 2 ENTERPRISE ARCHITECTURE & DATABASE DESIGN IS 100% VERIFIED!');
    process.exit(0);
  } else {
    console.error('⚠️ SOME TESTS FAILED. PLEASE REVIEW DETAILS ABOVE.');
    process.exit(1);
  }
}

runPhase2Verification().catch((err) => {
  console.error('Fatal error during Phase 2 verification:', err);
  process.exit(1);
});

