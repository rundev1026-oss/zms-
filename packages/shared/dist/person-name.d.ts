export declare const PERSON_TITLE_OPTIONS: readonly ["นาย", "นาง", "นางสาว", "อิหม่าม", "ฮัจญี", "ฮัจญะห์", "อื่นๆ"];
export interface PersonNameInput {
    prefix?: string | null;
    title?: string | null;
    titlePrefix?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    fullName?: string | null;
}
export interface SplitPersonName {
    prefix: string;
    firstName: string;
    lastName: string;
}
export declare function normalizePersonPrefix(value: string | null | undefined): string;
export declare function splitPersonName(input: PersonNameInput): SplitPersonName;
export declare function formatPersonName(input: PersonNameInput): string;
