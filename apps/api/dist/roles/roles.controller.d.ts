import type { AuthUser } from '../common/auth-user';
import { CloneRoleDto, CreateRoleDto, UpdateRoleDto, UpdateRolePermissionsDto } from './roles.dto';
import { RolesService } from './roles.service';
export declare class RolesController {
    private readonly roles;
    constructor(roles: RolesService);
    list(): Promise<{
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
    getOne(id: string): Promise<{
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
    create(dto: CreateRoleDto, actor: AuthUser, ip: string): Promise<{
        id: string;
        code: string;
        name: string;
        isCustom: boolean;
        isSystem: boolean;
        status: string;
        message: string;
    }>;
    update(id: string, dto: UpdateRoleDto, actor: AuthUser, ip: string): Promise<{
        success: boolean;
        message: string;
    }>;
    clone(id: string, dto: CloneRoleDto, actor: AuthUser, ip: string): Promise<{
        id: string;
        code: string;
        name: string;
        isCustom: boolean;
        isSystem: boolean;
        status: string;
        message: string;
    }>;
    updatePermissions(id: string, dto: UpdateRolePermissionsDto, actor: AuthUser, ip: string): Promise<{
        success: boolean;
        assignedCount: number;
        message: string;
    }>;
}
