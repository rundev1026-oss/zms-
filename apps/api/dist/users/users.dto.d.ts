export declare class CreateUserDto {
    firstName?: string;
    lastName?: string;
    displayName?: string;
    username: string;
    email: string;
    phone?: string;
    password?: string;
    roleCode?: string;
    role?: string;
    branchId?: string;
    departmentId?: string;
    position?: string;
    dataScope?: 'OWN' | 'DEPARTMENT' | 'BRANCH' | 'ORGANIZATION';
    approvalLimit?: number | null;
}
export declare class UpdateUserDto {
    displayName?: string;
    phone?: string;
    position?: string;
    branchId?: string;
    departmentId?: string;
    roleCode?: string;
}
export declare class UpdateUserStatusDto {
    isActive?: boolean;
    status?: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
    reason?: string;
}
export declare class PermissionOverrideItemDto {
    permissionCode: string;
    effect: 'ALLOW' | 'DENY' | 'INHERIT';
    reason?: string;
}
export declare class UpdateUserPermissionsDto {
    overrides: PermissionOverrideItemDto[];
    dataScope?: 'OWN' | 'DEPARTMENT' | 'BRANCH' | 'ORGANIZATION';
    approvalLimit?: number | null;
    reason?: string;
}
export declare class QueryUsersDto {
    search?: string;
    role?: string;
    branchId?: string;
    departmentId?: string;
    status?: string;
    page?: number;
    pageSize?: number;
}
