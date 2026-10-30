export declare function generateBase32Secret(length?: number): string;
export declare function base32Decode(input: string): Buffer;
export declare function generateTotp(secretBase32: string, time?: number, timeStepSec?: number): string;
export declare function verifyTotp(token: string, secretBase32: string, window?: number, timeStepSec?: number): boolean;
export declare function generateRecoveryCodes(count?: number): string[];
export declare function generateOtpAuthUri(accountName: string, issuer: string, secretBase32: string): string;
