import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuditModule } from '../audit/audit.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LoginRateLimiter } from './login-rate-limiter';
import { PermissionsGuard } from './permissions.guard';
import { RolesGuard } from './roles.guard';

@Module({
  imports: [
    UsersModule,
    AuditModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: { algorithm: 'HS256' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LoginRateLimiter,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AuthModule {}
