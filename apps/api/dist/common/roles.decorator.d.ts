export declare const ROLES_KEY = "roles";
export type SystemRole = 'SUPER_ADMIN' | 'ADMIN' | 'ASSISTANCE_OFFICER' | 'FINANCE_OFFICER' | 'TREASURER' | 'APPROVER' | 'AUDITOR' | 'SHARIA_REVIEWER' | 'PUBLIC_USER';
export declare const Roles: (...roles: (SystemRole | string)[]) => import("@nestjs/common").CustomDecorator<string>;
