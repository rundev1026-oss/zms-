import cookieParser from 'cookie-parser';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { APP_VERSION } from '@zms/shared';
import helmet from 'helmet';
import { AppModule } from './app.module';
import {
  assertProductionEnvironment,
  swaggerEnabled,
  trustProxyHops,
} from './config/production-env';
import { createValidationPipe } from './common/validation.pipe';

async function bootstrap(): Promise<void> {
  assertProductionEnvironment(process.env);
  if (process.env.NODE_ENV === 'production') {
    Logger.log('Production configuration accepted', 'Bootstrap');
  }

  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  // OWASP A05: Security Headers via Helmet
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  const proxyHops = trustProxyHops(process.env);
  if (proxyHops !== false) {
    app.getHttpAdapter().getInstance().set('trust proxy', proxyHops);
  }

  const prefix = process.env.API_PREFIX ?? 'api/v1';
  app.setGlobalPrefix(prefix);

  const webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:3000';
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) return callback(null, true);
      const allowedOrigins = [
        webOrigin,
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:5173',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
      ];
      if (allowedOrigins.includes(origin) || origin.startsWith('http://localhost:')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'x-zms-csrf'],
  });

  app.use(cookieParser());
  app.useGlobalPipes(createValidationPipe());

  if (swaggerEnabled(process.env)) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('ZMS API')
      .setDescription(
        'ระบบจัดการซะกาต — ยืนยันตัวตน สิทธิ์ และทะเบียนผู้มีสิทธิ์ ผลคุณสมบัติมาจากการบันทึกของเจ้าหน้าที่',
      )
      .setVersion(APP_VERSION)
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = Number(process.env.API_PORT ?? 3000);
  await app.listen(port);
}

void bootstrap();
