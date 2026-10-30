export interface AuthRole {
  code: string;
  name: string;
}

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  roles: AuthRole[];
  permissions: string[];
}
