process.env.DATABASE_URL ??= 'postgresql://zms:zms@localhost:5432/zms?schema=public';
process.env.API_PREFIX ??= 'api/v1';
process.env.JWT_ACCESS_SECRET ??= 'test-only-access-secret';
process.env.JWT_ACCESS_TTL_SECONDS ??= '900';
process.env.REFRESH_TTL_SECONDS ??= '604800';
