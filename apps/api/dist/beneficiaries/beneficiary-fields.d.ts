import type { IdentityType } from '@prisma/client';
export interface IdentityFields {
    identityNumber: string | null;
    identityNumberNormalized: string | null;
}
export declare function readIdentity(identityType: IdentityType, raw: string | null | undefined): IdentityFields;
export declare function completedAgeYears(isoDate: string, today: Date): number | null;
export declare function readDateOfBirth(raw: string | null | undefined): Date | null;
