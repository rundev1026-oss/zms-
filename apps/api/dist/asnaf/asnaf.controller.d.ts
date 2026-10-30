import { AsnafService } from './asnaf.service';
export declare class AsnafController {
    private readonly asnaf;
    constructor(asnaf: AsnafService);
    list(): import(".prisma/client").Prisma.PrismaPromise<{
        code: string;
        id: string;
        nameTh: string;
        sortOrder: number;
    }[]>;
}
