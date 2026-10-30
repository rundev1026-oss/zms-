import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QueryAuditLogsDto } from './dto/audit-query.dto';
export interface AuditEntry {
    actorId: string | null;
    action: string;
    resourceType: string;
    resourceId: string | null;
    metadata?: Record<string, string | number | boolean | null>;
}
type AuditWriter = PrismaService | Prisma.TransactionClient;
export declare class AuditService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    write(entry: AuditEntry): Promise<void>;
    record(writer: AuditWriter, entry: AuditEntry): Promise<void>;
    list(query: QueryAuditLogsDto): Promise<{
        items: {
            createdAt: string;
            actor: {
                id: string;
                email: string;
                displayName: string;
            } | null;
            description: string | null;
            action: string;
            resourceType: string;
            resourceId: string | null;
            actorId: string | null;
            userRole: string | null;
            id: string;
            legacyId: string | null;
            userName: string | null;
            ipAddress: string | null;
            metadata: Prisma.JsonValue | null;
        }[];
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    }>;
    getById(id: string): Promise<{
        createdAt: string;
        actor: {
            id: string;
            email: string;
            displayName: string;
        } | null;
        description: string | null;
        action: string;
        resourceType: string;
        resourceId: string | null;
        actorId: string | null;
        userRole: string | null;
        id: string;
        legacyId: string | null;
        userName: string | null;
        ipAddress: string | null;
        metadata: Prisma.JsonValue | null;
    }>;
    getSummary(): Promise<{
        totalAuditLogs: number;
        topActions: {
            action: string;
            count: number;
        }[];
        timestamp: string;
    }>;
}
export {};
