import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { formatPersonName } from '@zms/shared';
import { isPlaceholderPersonName } from '@/lib/personName';

export type RegistryPersonRecord = {
  name: string;
  registryNumber: string;
  memberId: string;
};

type RegistryPrisma = {
  beneficiary: {
    findMany: (args: {
      where: { id: { in: string[] } };
      select: {
        id: true;
        title: true;
        firstName: true;
        lastName: true;
        registryNumber: true;
        memberId: true;
      };
    }) => Promise<Array<{
      id: string;
      title: string | null;
      firstName: string | null;
      lastName: string | null;
      registryNumber: string | null;
      memberId: string | null;
    }>>;
  };
};

const globalForRegistry = globalThis as unknown as { registryPersonPrisma?: RegistryPrisma };

function ensureDatabaseUrl() {
  if (process.env.DATABASE_URL) return;
  const envPath = path.join(process.cwd(), 'apps', 'api', '.env');
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^DATABASE_URL=(.*)$/);
    if (!match) continue;
    let value = match[1].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (value) process.env.DATABASE_URL = value;
    return;
  }
}

function getRegistryPrisma(): RegistryPrisma | null {
  if (globalForRegistry.registryPersonPrisma) return globalForRegistry.registryPersonPrisma;
  ensureDatabaseUrl();
  if (!process.env.DATABASE_URL) return null;
  const require = createRequire(path.join(process.cwd(), 'apps', 'api', 'package.json'));
  const { PrismaClient } = require('@prisma/client') as { PrismaClient: new () => RegistryPrisma };
  const client = new PrismaClient();
  globalForRegistry.registryPersonPrisma = client;
  return client;
}

/**
 * Read display names from the zakat registry (PostgreSQL) by the beneficiary id
 * stored on the assistance application. Does not create or update registry rows.
 */
export async function lookupRegistryPeople(ids: string[]): Promise<Map<string, RegistryPersonRecord>> {
  const unique = [...new Set(ids.map((id) => String(id || '').trim()).filter((id) => id.length > 0))];
  const people = new Map<string, RegistryPersonRecord>();
  if (unique.length === 0) return people;

  try {
    const prisma = getRegistryPrisma();
    if (!prisma) return people;
    const rows = await prisma.beneficiary.findMany({
      where: { id: { in: unique } },
      select: {
        id: true,
        title: true,
        firstName: true,
        lastName: true,
        registryNumber: true,
        memberId: true,
      },
    });
    for (const row of rows) {
      const name = formatPersonName({
        prefix: row.title,
        firstName: row.firstName,
        lastName: row.lastName,
      }).trim();
      if (isPlaceholderPersonName(name)) continue;
      people.set(row.id, {
        name,
        registryNumber: String(row.registryNumber || '').trim(),
        memberId: String(row.memberId || '').trim(),
      });
    }
  } catch (error) {
    console.error('lookupRegistryPeople failed', error);
  }

  return people;
}

export async function lookupRegistryPersonNames(ids: string[]): Promise<Map<string, string>> {
  const people = await lookupRegistryPeople(ids);
  const names = new Map<string, string>();
  for (const [id, person] of people) names.set(id, person.name);
  return names;
}
