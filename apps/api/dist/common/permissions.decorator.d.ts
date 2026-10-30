import type { PermissionCode } from '@zms/shared';
export declare const PERMISSIONS_KEY = "permissions";
export declare const RequirePermissions: (...permissions: PermissionCode[]) => import("@nestjs/common").CustomDecorator<string>;
