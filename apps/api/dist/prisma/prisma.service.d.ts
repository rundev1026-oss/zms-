import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
export declare class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger;
    private connected;
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    isConnected(): boolean;
    ping(): Promise<{
        connected: boolean;
        message: string;
    }>;
}
