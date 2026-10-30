import type { AddressType } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { BeneficiariesService } from '../beneficiaries/beneficiaries.service';
import type { AuthUser } from '../common/auth-user';
import { PrismaService } from '../prisma/prisma.service';
export interface AddressInput {
    addressType: AddressType;
    addressLine?: string;
    community?: string;
    subdistrict?: string;
    district?: string;
    province?: string;
    postalCode?: string;
    latitude?: number;
    longitude?: number;
}
export declare class AddressesService {
    private readonly prisma;
    private readonly beneficiaries;
    private readonly audit;
    constructor(prisma: PrismaService, beneficiaries: BeneficiariesService, audit: AuditService);
    list(beneficiaryId: string, actor: AuthUser): Promise<{
        id: string;
        addressType: import(".prisma/client").$Enums.AddressType;
        addressLine: string | null;
        community: string | null;
        subdistrict: string | null;
        district: string | null;
        province: string | null;
        postalCode: string | null;
        latitude: string | null;
        longitude: string | null;
    }[]>;
    replace(beneficiaryId: string, addresses: AddressInput[], actor: AuthUser): Promise<{
        id: string;
        addressType: import(".prisma/client").$Enums.AddressType;
        addressLine: string | null;
        community: string | null;
        subdistrict: string | null;
        district: string | null;
        province: string | null;
        postalCode: string | null;
        latitude: string | null;
        longitude: string | null;
    }[]>;
    private assertCoordinate;
    private toView;
}
