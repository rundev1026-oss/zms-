import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { redactDatabaseMessage } from './database-error';

const DATABASE_CHECK_MS = 2000;

function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Database check timed out'));
    }, ms);

    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error('Unknown database error'));
      },
    );
  });
}

function databaseErrorMessage(error: unknown): string {
  return redactDatabaseMessage(error);
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private connected = false;

  async onModuleInit(): Promise<void> {
    try {
      await withTimeout(this.$connect(), DATABASE_CHECK_MS);
      this.connected = true;
      this.logger.log('Connected to PostgreSQL');
    } catch (error) {
      this.connected = false;
      this.logger.warn(`PostgreSQL is not available yet: ${databaseErrorMessage(error)}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await withTimeout(this.$disconnect(), DATABASE_CHECK_MS);
    } catch (error) {
      this.logger.warn(`Disconnect skipped: ${databaseErrorMessage(error)}`);
    }
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async ping(): Promise<{ connected: boolean; message: string }> {
    try {
      await withTimeout(this.$queryRaw`SELECT 1`, DATABASE_CHECK_MS);
      this.connected = true;
      return { connected: true, message: 'PostgreSQL reachable' };
    } catch (error) {
      this.connected = false;
      return { connected: false, message: databaseErrorMessage(error) };
    }
  }
}
