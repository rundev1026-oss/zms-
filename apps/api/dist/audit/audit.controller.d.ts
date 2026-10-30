import { QueryAuditLogsDto } from './dto/audit-query.dto';
import { AuditService } from './audit.service';
export declare class AuditController {
    private readonly audit;
    constructor(audit: AuditService);
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
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
        }[];
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    }>;
    getSummary(): Promise<{
        totalAuditLogs: number;
        topActions: {
            action: string;
            count: number;
        }[];
        timestamp: string;
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
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
}
