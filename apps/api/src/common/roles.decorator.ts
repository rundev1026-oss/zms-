import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

export type SystemRole = 
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'ASSISTANCE_OFFICER'
  | 'FINANCE_OFFICER'
  | 'TREASURER'
  | 'APPROVER'
  | 'AUDITOR'
  | 'SHARIA_REVIEWER'
  | 'PUBLIC_USER';

export const Roles = (...roles: (SystemRole | string)[]) => SetMetadata(ROLES_KEY, roles);

