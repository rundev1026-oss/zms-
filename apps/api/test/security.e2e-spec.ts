import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ApiExceptionFilter } from '../src/common/api-exception.filter';
import { createValidationPipe } from '../src/common/validation.pipe';

describe('authorization boundaries (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(createValidationPipe());
    app.useGlobalFilters(new ApiExceptionFilter());
    await app.init();
  }, 30_000);

  afterAll(async () => {
    await app.close();
  }, 20_000);

  const server = (): Server => app.getHttpServer() as Server;
  const password = 'not-the-real-password';

  it('rejects anonymous access to registry, documents, export, and another user profile', async () => {
    const paths = [
      '/api/v1/beneficiaries',
      '/api/v1/beneficiaries/11111111-1111-4111-8111-111111111111',
      '/api/v1/documents/33333333-3333-4333-8333-333333333333/content',
      '/api/v1/reports/beneficiaries/export',
      '/api/v1/users/me',
    ];
    for (const path of paths) {
      const response = await request(server()).get(path);
      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({ code: 'UNAUTHORIZED' });
      expect(JSON.stringify(response.body)).not.toContain('stack');
    }
  });

  it('rejects a forged bearer token before reading a record', async () => {
    const response = await request(server())
      .get('/api/v1/beneficiaries/11111111-1111-4111-8111-111111111111')
      .set('Authorization', 'Bearer not-a-token');
    expect(response.status).toBe(401);
    expect(response.body.code).toBe('UNAUTHORIZED');
  });

  it('rejects a login that smuggles another user id or is not an email', async () => {
    const response = await request(server()).post('/api/v1/auth/login').send({
      email: "registrar@zms.local' OR 1=1 --",
      password,
      userId: 'attacker',
    });
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('VALIDATION_ERROR');
    expect(JSON.stringify(response.body)).not.toContain(password);
    expect(JSON.stringify(response.body)).not.toContain('attacker');
  });

  it('does not echo a password when login cannot complete', async () => {
    const response = await request(server()).post('/api/v1/auth/login').send({
      email: 'registrar@zms.local',
      password,
    });
    expect([401, 500]).toContain(response.status);
    expect(JSON.stringify(response.body)).not.toContain(password);
    expect(JSON.stringify(response.body)).not.toContain('postgresql://');
    expect(response.body).not.toHaveProperty('stack');
  });
});
