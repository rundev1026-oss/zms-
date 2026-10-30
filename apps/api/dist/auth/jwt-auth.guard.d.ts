import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
export declare class JwtAuthGuard implements CanActivate {
    private readonly reflector;
    private readonly jwt;
    private readonly users;
    constructor(reflector: Reflector, jwt: JwtService, users: UsersService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
