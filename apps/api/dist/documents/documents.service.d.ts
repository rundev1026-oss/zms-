import { AuditService } from '../audit/audit.service';
import { BeneficiariesService } from '../beneficiaries/beneficiaries.service';
import type { AuthUser } from '../common/auth-user';
import { PrismaService } from '../prisma/prisma.service';
export declare const STORAGE_ROOT = "STORAGE_ROOT";
export declare class DocumentsService {
    private readonly prisma;
    private readonly beneficiaries;
    private readonly audit;
    private readonly storageRoot;
    constructor(prisma: PrismaService, beneficiaries: BeneficiariesService, audit: AuditService, storageRoot: string);
    list(beneficiaryId: string): Promise<{
        fileAvailable: boolean;
        uploadedByName: string | null;
        id: string;
        beneficiaryId: string;
        documentType: string;
        originalFileName: string;
        sizeBytes: number;
        mimeType: string;
        status: import(".prisma/client").$Enums.DocumentStatus;
        createdAt: string;
        reviewedAt: string | null;
    }[]>;
    upload(beneficiaryId: string, file: {
        buffer: Buffer;
        originalname: string;
        mimetype: string;
    } | undefined, documentType: string, actor: AuthUser, replacesDocumentId?: string): Promise<{
        fileAvailable: boolean;
        uploadedByName: string;
        id: string;
        beneficiaryId: string;
        documentType: string;
        originalFileName: string;
        sizeBytes: number;
        mimeType: string;
        status: import(".prisma/client").$Enums.DocumentStatus;
        createdAt: string;
        reviewedAt: string | null;
    }>;
    review(documentId: string, input: {
        status: 'ACCEPTED' | 'REJECTED';
        reviewNote?: string;
    }, actor: AuthUser): Promise<{
        id: string;
        beneficiaryId: string;
        documentType: string;
        originalFileName: string;
        sizeBytes: number;
        mimeType: string;
        status: import(".prisma/client").$Enums.DocumentStatus;
        createdAt: string;
        reviewedAt: string | null;
    }>;
    remove(documentId: string, actor: AuthUser): Promise<{
        id: string;
        deleted: boolean;
    }>;
    readContent(documentId: string, actor: AuthUser): Promise<{
        bytes: Buffer<ArrayBufferLike>;
        mimeType: string;
        fileName: string;
    }>;
    private findActive;
    private resolve;
    private fileAvailable;
    private toView;
}
