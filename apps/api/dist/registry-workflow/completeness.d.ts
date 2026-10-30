import type { ApiErrorDetail } from '@zms/shared';
export interface CompletenessInput {
    firstName: string;
    lastName: string;
    identityType: 'THAI_NATIONAL_ID' | 'OTHER';
    identityNumber: string | null;
    dateOfBirth: Date | null;
    phone: string | null;
    addressCountWithArea: number;
    hasHousehold: boolean;
    hasAcceptedConsent: boolean;
}
export declare function missingSubmitFields(input: CompletenessInput): ApiErrorDetail[];
