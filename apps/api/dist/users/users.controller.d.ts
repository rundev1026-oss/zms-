import type { AuthUser } from '../common/auth-user';
import { CreateUserDto, PermissionOverrideItemDto, QueryUsersDto, UpdateUserDto, UpdateUserPermissionsDto, UpdateUserStatusDto } from './users.dto';
import { UsersService } from './users.service';
export declare class UsersController {
    private readonly users;
    constructor(users: UsersService);
    me(user: AuthUser): {
        id: string;
        email: string;
        displayName: string;
        username: string | undefined;
        roles: import("../common/auth-user").AuthRole[];
        permissions: string[];
        branchId: string | null | undefined;
        departmentId: string | null | undefined;
        dataScope: string | undefined;
        approvalLimit: number | null | undefined;
        mfaEnabled: boolean;
    };
    findAll(query: QueryUsersDto): Promise<{
        items: {
            id: string;
            email: string;
            username: string;
            displayName: string;
            phone: string;
            position: string;
            branch: string;
            branchId: string;
            departmentId: string;
            isActive: boolean;
            status: string;
            mfaEnabled: boolean;
            lastLoginAt: Date | null;
            createdAt: Date;
            roles: {
                id: string;
                code: string;
                name: string;
            }[];
            primaryRoleCode: string;
            primaryRoleName: string;
            dataScope: string;
            approvalLimit: number | null;
            overridesCount: number;
        }[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
        stats: {
            totalUsers: number;
            activeUsers: number;
            inactiveUsers: number;
            suspendedUsers: number;
            totalRoles: number;
            pendingPermissions: number;
        };
    }>;
    create(dto: CreateUserDto, actor: AuthUser, ip: string): Promise<{
        id: string;
        username: string | null;
        email: string;
        displayName: string;
        role: string;
        dataScope: "OWN" | "DEPARTMENT" | "BRANCH" | "ORGANIZATION";
        message: string;
    }>;
    findOne(id: string): Promise<{
        id: string;
        email: string;
        username: string;
        displayName: string;
        phone: string | null;
        position: string | null;
        branch: string | null;
        branchId: string | null;
        departmentId: string | null;
        isActive: boolean;
        mfaEnabled: boolean;
        lastLoginAt: Date | null;
        createdAt: Date;
        roles: {
            id: string;
            code: string;
            name: string;
            isSystem: boolean;
        }[];
        dataScope: {
            scope: string;
            branchId: string | null;
            departmentId: string | null;
            approvalLimit: number | null;
        } | {
            scope: string;
            approvalLimit: null;
            branchId?: undefined;
            departmentId?: undefined;
        };
        rolePermissions: string[];
        overrides: {
            permissionCode: string;
            effect: string;
            reason: string | null;
            createdAt: Date;
        }[];
        effectivePermissions: string[];
    }>;
    update(id: string, dto: UpdateUserDto, actor: AuthUser, ip: string): Promise<{
        success: boolean;
        message: string;
    }>;
    updateStatus(id: string, dto: UpdateUserStatusDto, actor: AuthUser, ip: string): Promise<{
        success: boolean;
        isActive: boolean;
        message: string;
    }>;
    resetPassword(id: string, newPassword: string, actor: AuthUser): Promise<{
        success: boolean;
        message: string;
    }>;
    getUserPermissions(id: string): Promise<{
        userId: string;
        displayName: string;
        email: string;
        username: string | null;
        roles: {
            code: string;
            name: string;
        }[];
        dataScope: string;
        approvalLimit: number | null;
        rolePermissions: string[];
        overrides: {
            permissionCode: string;
            effect: string;
            reason: string | null;
        }[];
        effectivePermissions: string[];
        catalog: import("@zms/shared").ModuleCatalogItem[];
    }>;
    getEffectivePermissions(id: string): Promise<{
        userId: string;
        roles: {
            id: string;
            code: string;
            name: string;
            isSystem: boolean;
        }[];
        permissions: string[];
        dataScope: string;
        approvalLimit: number | null;
    }>;
    updateUserPermissions(id: string, dto: UpdateUserPermissionsDto, actor: AuthUser, ip: string): Promise<{
        success: boolean;
        message: string;
    }>;
    previewEffectivePermissions(id: string, body: {
        overrides: PermissionOverrideItemDto[];
        roleCode?: string;
    }): Promise<{
        userId: string;
        rolePermissions: string[];
        effectivePermissions: string[];
        effectiveCount: number;
    }>;
}
