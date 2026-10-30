import { PrismaService } from '../prisma/prisma.service';
import { CloneRoleDto, CreateRoleDto, UpdateRoleDto, UpdateRolePermissionsDto } from './roles.dto';
export declare class RolesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    listCatalog(): Promise<{
        id: string;
        code: string;
        name: string;
        description: string | null;
        isSystem: boolean;
        isCustom: boolean;
        status: string;
        userCount: number;
        permissionCount: number;
        permissions: string[];
    }[]>;
    getRole(id: string): Promise<{
        id: string;
        code: string;
        name: string;
        description: string | null;
        isSystem: boolean;
        isCustom: boolean;
        status: string;
        permissions: string[];
        users: {
            id: string;
            username: string | null;
            email: string;
            displayName: string;
            isActive: boolean;
        }[];
    }>;
    createRole(dto: CreateRoleDto, actorId: string, ipAddress?: string): Promise<{
        id: string;
        code: string;
        name: string;
        isCustom: boolean;
        isSystem: boolean;
        status: string;
        message: string;
    }>;
    updateRole(id: string, dto: UpdateRoleDto, actorId: string, ipAddress?: string): Promise<{
        success: boolean;
        message: string;
    }>;
    cloneRole(sourceRoleId: string, dto: CloneRoleDto, actorId: string, ipAddress?: string): Promise<{
        id: string;
        code: string;
        name: string;
        isCustom: boolean;
        isSystem: boolean;
        status: string;
        message: string;
    }>;
    updateRolePermissions(roleId: string, dto: UpdateRolePermissionsDto, actorId: string, ipAddress?: string): Promise<{
        success: boolean;
        assignedCount: number;
        message: string;
    }>;
}
