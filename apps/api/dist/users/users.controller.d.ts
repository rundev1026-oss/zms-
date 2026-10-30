import type { AuthUser } from '../common/auth-user';
import { UsersService } from './users.service';
export declare class UsersController {
    private readonly users;
    constructor(users: UsersService);
    me(user: AuthUser): {
        id: string;
        email: string;
        displayName: string;
        roles: import("../common/auth-user").AuthRole[];
        permissions: string[];
        mfaEnabled: boolean;
    };
}
