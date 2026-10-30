export interface AuthRole {
    code: string;
    name: string;
}
export interface AuthUser {
    id: string;
    email: string;
    displayName: string;
    username?: string;
    branchId?: string | null;
    departmentId?: string | null;
    position?: string | null;
    dataScope?: string;
    approvalLimit?: number | null;
    roles: AuthRole[];
    permissions: string[];
}
