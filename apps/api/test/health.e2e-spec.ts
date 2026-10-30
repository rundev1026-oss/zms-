import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  }, 30_000);

  afterAll(async () => {
    await app.close();
  }, 20_000);

  it('GET /api/v1/health returns a health payload', async () => {
    const server = app.getHttpServer() as Server;
    const response = await request(server).get('/api/v1/health').expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        service: 'zms-api',
        version: '0.1.0',
        status: expect.stringMatching(/^(ok|degraded)$/),
        database: expect.objectContaining({
          connected: expect.any(Boolean),
          message: expect.any(String),
        }),
      }),
    );
    expect(JSON.stringify(response.body)).not.toContain('postgresql://');
  });

  it('GET /api/v1/health/ready returns 503 when PostgreSQL is down and 200 when it is up', async () => {
    const server = app.getHttpServer() as Server;
    const response = await request(server).get('/api/v1/health/ready');

    expect([200, 503]).toContain(response.status);
    expect(response.body.database.connected).toBe(response.status === 200);
    expect(JSON.stringify(response.body)).not.toContain('postgresql://');
  });
});
