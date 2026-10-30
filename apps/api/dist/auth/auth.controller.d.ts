import type { Request, Response } from 'express';
import type { AuthUser } from '../common/auth-user';
import { Disable2faDto, Enable2faDto, ForgotPasswordDto, LoginDto, ResetPasswordDto, Verify2faDto } from '../common/request.dto';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
export declare class AuthController {
    private readonly auth;
    private readonly users;
    constructor(auth: AuthService, users: UsersService);
    login(dto: LoginDto, ip: string, request: Request, response: Response): Promise<{
        mfaRequired: boolean;
        tempToken: string;
        expiresIn: number;
        userId: string;
        email: string;
        accessToken?: undefined;
        tokenType?: undefined;
        user?: undefined;
    } | {
        mfaRequired: boolean;
        accessToken: string;
        tokenType: "Bearer";
        expiresIn: number;
        user: {
            id: string;
            email: string;
            displayName: string;
            username: string | undefined;
            roles: import("../common/auth-user").AuthRole[];
            permissions: string[];
            branchId: string | null | undefined;
            departmentId: string | null | undefined;
            dataScope: string | undefined;
            approvalLimit: number | null | undefined;
            mfaEnabled: boolean;
        };
        tempToken?: undefined;
        userId?: undefined;
        email?: undefined;
    }>;
    verify2fa(dto: Verify2faDto, ip: string, request: Request, response: Response): Promise<{
        mfaRequired: boolean;
        accessToken: string;
        tokenType: "Bearer";
        expiresIn: number;
        user: {
            id: string;
            email: string;
            displayName: string;
            username: string | undefined;
            roles: import("../common/auth-user").AuthRole[];
            permissions: string[];
            branchId: string | null | undefined;
            departmentId: string | null | undefined;
            dataScope: string | undefined;
            approvalLimit: number | null | undefined;
            mfaEnabled: boolean;
        };
    }>;
    setup2fa(user: AuthUser): Promise<{
        secret: string;
        otpAuthUri: string;
        recoveryCodes: string[];
    }>;
    enable2fa(user: AuthUser, dto: Enable2faDto): Promise<{
        enabled: boolean;
    }>;
    disable2fa(user: AuthUser, dto: Disable2faDto): Promise<{
        disabled: boolean;
    }>;
    forgotPassword(dto: ForgotPasswordDto, ip: string): Promise<{
        message: string;
        resetToken?: string;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        message: string;
    }>;
    refresh(request: Request, csrf: string | undefined, response: Response): Promise<{
        accessToken: string;
        tokenType: "Bearer";
        expiresIn: number;
        user: {
            id: string;
            email: string;
            displayName: string;
            username: string | undefined;
            roles: import("../common/auth-user").AuthRole[];
            permissions: string[];
            branchId: string | null | undefined;
            departmentId: string | null | undefined;
            dataScope: string | undefined;
            approvalLimit: number | null | undefined;
            mfaEnabled: boolean;
        };
    }>;
    logout(request: Request, csrf: string | undefined, response: Response): Promise<{
        loggedOut: boolean;
    }>;
    me(user: AuthUser): Promise<{
        id: string;
        email: string;
        displayName: string;
        username: string | undefined;
        roles: import("../common/auth-user").AuthRole[];
        permissions: string[];
        branchId: string | null | undefined;
        departmentId: string | null | undefined;
        dataScope: string | undefined;
        approvalLimit: number | null | undefined;
        mfaEnabled: boolean;
    }>;
}
