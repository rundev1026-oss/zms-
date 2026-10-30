import type { AuthUser } from '../common/auth-user';
import { ReplaceAddressesDto } from '../common/request.dto';
import { AddressesService } from './addresses.service';
export declare class AddressesController {
    private readonly addresses;
    constructor(addresses: AddressesService);
    list(beneficiaryId: string, user: AuthUser): Promise<{
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
    replace(beneficiaryId: string, dto: ReplaceAddressesDto, user: AuthUser): Promise<{
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
}
