import type { AuthRole, AuthUser } from '../common/auth-user';
import { PrismaService } from '../prisma/prisma.service';
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
        email: string;
        displayName: string;
        isActive: boolean;
        mfaEnabled: boolean;
        mfaSecret: string | null;
        mfaRecoveryHash: string | null;
    } | null>;
    findUserByEmail(email: string): Promise<{
        id: string;
        email: string;
        displayName: string;
        isActive: boolean;
        mfaEnabled: boolean;
    } | null>;
    loadAuthUser(userId: string): Promise<AuthUser | null>;
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
        roles: AuthRole[];
        permissions: string[];
        mfaEnabled: boolean;
    };
}
