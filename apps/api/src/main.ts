import cookieParser from 'cookie-parser';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { APP_VERSION } from '@zms/shared';
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
  const proxyHops = trustProxyHops(process.env);
  if (proxyHops !== false) {
    app.getHttpAdapter().getInstance().set('trust proxy', proxyHops);
  }

  const prefix = process.env.API_PREFIX ?? 'api/v1';
  app.setGlobalPrefix(prefix);

  const webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:5173';
  app.enableCors({
    origin: webOrigin,
    credentials: true,
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
