export type AllowedFileKind = 'pdf' | 'jpg' | 'png';
export declare function detectAllowedFile(buffer: Buffer): AllowedFileKind | null;
export declare function extensionForKind(kind: AllowedFileKind): string;
export declare function mimeForKind(kind: AllowedFileKind): string;
