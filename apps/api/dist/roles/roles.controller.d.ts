import { RolesService } from './roles.service';
export declare class RolesController {
    private readonly roles;
    constructor(roles: RolesService);
    list(): Promise<{
        code: string;
        name: string;
        description: string | null;
        permissions: string[];
    }[]>;
}
