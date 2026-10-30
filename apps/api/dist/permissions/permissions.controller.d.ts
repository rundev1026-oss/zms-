import { PrismaService } from '../prisma/prisma.service';
export declare class PermissionsController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getCatalog(): {
        success: boolean;
        modules: import("@zms/shared").ModuleCatalogItem[];
        totalModules: number;
        totalActions: number;
    };
    getAuditLogs(targetUserId?: string, targetRoleId?: string, page?: number, pageSize?: number): Promise<{
        success: boolean;
        items: ({
            actor: {
                id: string;
                username: string | null;
                email: string;
                displayName: string;
            };
            targetUser: {
                id: string;
                username: string | null;
                email: string;
                displayName: string;
            } | null;
            targetRole: {
                code: string;
                id: string;
                name: string;
            } | null;
        } & {
            action: string;
            actorId: string;
            details: import("@prisma/client/runtime/library").JsonValue | null;
            id: string;
            ipAddress: string | null;
            createdAt: Date;
            reason: string | null;
            targetUserId: string | null;
            targetRoleId: string | null;
        })[];
        data: ({
            actor: {
                id: string;
                username: string | null;
                email: string;
                displayName: string;
            };
            targetUser: {
                id: string;
                username: string | null;
                email: string;
                displayName: string;
            } | null;
            targetRole: {
                code: string;
                id: string;
                name: string;
            } | null;
        } & {
            action: string;
            actorId: string;
            details: import("@prisma/client/runtime/library").JsonValue | null;
            id: string;
            ipAddress: string | null;
            createdAt: Date;
            reason: string | null;
            targetUserId: string | null;
            targetRoleId: string | null;
        })[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
    }>;
}
