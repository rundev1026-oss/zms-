import { StreamableFile } from '@nestjs/common';
import type { AuthUser } from '../common/auth-user';
import { ReviewDocumentDto, UploadDocumentDto } from '../common/request.dto';
import { DocumentsService } from './documents.service';
export declare class DocumentsController {
    private readonly documents;
    constructor(documents: DocumentsService);
    list(beneficiaryId: string): Promise<{
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
    upload(beneficiaryId: string, dto: UploadDocumentDto, file: {
        buffer: Buffer;
        originalname: string;
        mimetype: string;
    } | undefined, user: AuthUser): Promise<{
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
    review(documentId: string, dto: ReviewDocumentDto, user: AuthUser): Promise<{
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
    remove(documentId: string, user: AuthUser): Promise<{
        id: string;
        deleted: boolean;
    }>;
    content(documentId: string, user: AuthUser): Promise<StreamableFile>;
}
