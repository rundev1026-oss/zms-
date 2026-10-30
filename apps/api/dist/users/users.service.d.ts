import type { AuthRole, AuthUser } from '../common/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, PermissionOverrideItemDto, QueryUsersDto, UpdateUserDto, UpdateUserPermissionsDto, UpdateUserStatusDto } from './users.dto';
export interface LoginAccount {
    id: string;
    email: string;
    passwordHash: string;
    isActive: boolean;
    mfaEnabled: boolean;
    mfaSecret: string | null;
    mfaRecoveryHash: string | null;
}
export declare class UsersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findLoginAccount(email: string): Promise<LoginAccount | null>;
    findUserById(id: string): Promise<{
        id: string;
        username: string | null;
        email: string;
        displayName: string;
        isActive: boolean;
        mfaEnabled: boolean;
        mfaSecret: string | null;
        mfaRecoveryHash: string | null;
    } | null>;
    findUserByEmail(email: string): Promise<{
        id: string;
        username: string | null;
        email: string;
        displayName: string;
        isActive: boolean;
        mfaEnabled: boolean;
    } | null>;
    loadAuthUser(userId: string): Promise<AuthUser | null>;
    findAllUsers(query: QueryUsersDto): Promise<{
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
    getUserDetail(userId: string): Promise<{
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
    createUser(dto: CreateUserDto, actorId: string, ipAddress?: string): Promise<{
        id: string;
        username: string | null;
        email: string;
        displayName: string;
        role: string;
        dataScope: "OWN" | "DEPARTMENT" | "BRANCH" | "ORGANIZATION";
        message: string;
    }>;
    updateUser(userId: string, dto: UpdateUserDto, actorId: string, ipAddress?: string): Promise<{
        success: boolean;
        message: string;
    }>;
    updateUserStatus(userId: string, dto: UpdateUserStatusDto, actorId: string, ipAddress?: string): Promise<{
        success: boolean;
        isActive: boolean;
        message: string;
    }>;
    getUserPermissions(userId: string): Promise<{
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
    updateUserPermissions(userId: string, dto: UpdateUserPermissionsDto, actorId: string, ipAddress?: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getEffectivePermissionsPreview(userId: string, proposedOverrides: PermissionOverrideItemDto[], proposedRoleCode?: string): Promise<{
        userId: string;
        rolePermissions: string[];
        effectivePermissions: string[];
        effectiveCount: number;
    }>;
    resetUserPassword(userId: string, actorId: string, newPassword?: string): Promise<{
        success: boolean;
        message: string;
    }>;
    updateMfa(userId: string, enabled: boolean, secret: string | null, recoveryHash: string | null): Promise<void>;
    updatePassword(userId: string, passwordHash: string): Promise<void>;
    recordLoginAttempt(params: {
        userId?: string | null;
        email: string;
        ipAddress: string;
        userAgent?: string;
        status: 'SUCCESS' | 'FAILED_CREDENTIALS' | 'FAILED_MFA' | 'LOCKED';
    }): Promise<void>;
    toProfile(user: AuthUser, mfaEnabled?: boolean): {
        id: string;
        email: string;
        displayName: string;
        username: string | undefined;
        roles: AuthRole[];
        permissions: string[];
        branchId: string | null | undefined;
        departmentId: string | null | undefined;
        dataScope: string | undefined;
        approvalLimit: number | null | undefined;
        mfaEnabled: boolean;
    };
}
