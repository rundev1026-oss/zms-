export declare class CreateRoleDto {
    code: string;
    name: string;
    description?: string;
    permissions?: string[];
}
export declare class UpdateRoleDto {
    name?: string;
    description?: string;
    status?: 'ACTIVE' | 'INACTIVE';
}
export declare class CloneRoleDto {
    newCode?: string;
    code?: string;
    newName?: string;
    name?: string;
    description?: string;
}
export declare class UpdateRolePermissionsDto {
    permissionCodes?: string[];
    permissions?: string[];
    reason?: string;
}
