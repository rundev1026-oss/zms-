import { PrismaService } from '../prisma/prisma.service';
export declare class RolesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    listCatalog(): Promise<{
        code: string;
        name: string;
        description: string | null;
        permissions: string[];
    }[]>;
}
