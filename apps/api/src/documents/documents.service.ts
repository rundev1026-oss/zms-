import { randomUUID } from 'node:crypto';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { DocumentStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { BeneficiariesService } from '../beneficiaries/beneficiaries.service';
import { AppException } from '../common/app.exception';
import type { AuthUser } from '../common/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import { detectAllowedFile, extensionForKind, mimeForKind } from './file-signature';

export const STORAGE_ROOT = 'STORAGE_ROOT';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly beneficiaries: BeneficiariesService,
    private readonly audit: AuditService,
    @Inject(STORAGE_ROOT) private readonly storageRoot: string,
  ) {}

  async list(beneficiaryId: string) {
    await this.beneficiaries.requireRecord(beneficiaryId);
    const rows = await this.prisma.beneficiaryDocument.findMany({
      where: { beneficiaryId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { uploadedBy: { select: { displayName: true, email: true } } },
    });
    return Promise.all(
      rows.map(async (row) => ({
        ...this.toView(row),
        fileAvailable: await this.fileAvailable(row.storageKey),
        uploadedByName: row.uploadedBy?.displayName || row.uploadedBy?.email || null,
      })),
    );
  }

  async upload(
    beneficiaryId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string } | undefined,
    documentType: string,
    actor: AuthUser,
    replacesDocumentId?: string,
  ) {
    await this.beneficiaries.requireRecord(beneficiaryId);
    if (file === undefined) {
      throw new AppException(HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', 'ข้อมูลไม่ถูกต้อง', [
        { field: 'file', message: 'กรุณาเลือกไฟล์' },
      ]);
    }
    const kind = detectAllowedFile(file.buffer);
    if (kind === null) {
      throw new AppException(HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', 'ข้อมูลไม่ถูกต้อง', [
        { field: 'file', message: 'รองรับเฉพาะไฟล์ pdf, jpg หรือ png ขนาดไม่เกิน 10 MB' },
      ]);
    }
    const originalFileName = safeOriginalName(file.originalname);
    const storageKey = `${beneficiaryId}/${randomUUID()}.${extensionForKind(kind)}`;
    const fullPath = this.resolve(storageKey);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, file.buffer);
    const row = await this.prisma.$transaction(async (tx) => {
      let previous: { id: string; originalFileName: string } | null = null;
      if (replacesDocumentId) {
        previous = await tx.beneficiaryDocument.findFirst({
          where: { id: replacesDocumentId, beneficiaryId, deletedAt: null },
          select: { id: true, originalFileName: true },
        });
        if (previous === null) {
          throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'ไม่พบเอกสารเดิมที่ต้องการเปลี่ยน');
        }
      }
      const created = await tx.beneficiaryDocument.create({
        data: {
          beneficiaryId,
          documentType,
          originalFileName,
          storageKey,
          sizeBytes: file.buffer.length,
          mimeType: mimeForKind(kind),
          uploadedById: actor.id,
        },
      });
      if (previous) {
        await tx.beneficiaryDocument.update({
          where: { id: previous.id },
          data: { deletedAt: new Date() },
        });
      }
      await this.audit.record(tx, {
        actorId: actor.id,
        action: previous ? 'DOCUMENT_REPLACE' : 'DOCUMENT_UPLOAD',
        resourceType: 'beneficiary_document',
        resourceId: created.id,
        metadata: {
          beneficiaryId,
          kind,
          sizeBytes: file.buffer.length,
          previousDocumentId: previous?.id ?? null,
          previousFileName: previous?.originalFileName ?? null,
        },
      });
      return created;
    });
    return {
      ...this.toView(row),
      fileAvailable: true,
      uploadedByName: actor.displayName || actor.email,
    };
  }

  async review(
    documentId: string,
    input: { status: 'ACCEPTED' | 'REJECTED'; reviewNote?: string },
    actor: AuthUser,
  ) {
    const existing = await this.findActive(documentId);
    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.beneficiaryDocument.update({
        where: { id: existing.id },
        data: {
          status: input.status,
          reviewNote: input.reviewNote ?? null,
          reviewedById: actor.id,
          reviewedAt: new Date(),
        },
      });
      await this.audit.record(tx, {
        actorId: actor.id,
        action: 'DOCUMENT_REVIEW',
        resourceType: 'beneficiary_document',
        resourceId: updated.id,
        metadata: { status: input.status },
      });
      return updated;
    });
    return this.toView(row);
  }

  async remove(documentId: string, actor: AuthUser) {
    const existing = await this.findActive(documentId);
    await this.prisma.$transaction(async (tx) => {
      await tx.beneficiaryDocument.update({
        where: { id: existing.id },
        data: { deletedAt: new Date() },
      });
      await this.audit.record(tx, {
        actorId: actor.id,
        action: 'DOCUMENT_DELETE',
        resourceType: 'beneficiary_document',
        resourceId: existing.id,
        metadata: { softDeleted: true },
      });
    });
    return { id: existing.id, deleted: true };
  }

  async readContent(documentId: string, actor: AuthUser) {
    const existing = await this.findActive(documentId);
    const fullPath = this.resolve(existing.storageKey);
    let bytes: Buffer;
    try {
      bytes = await readFile(fullPath);
    } catch {
      throw new AppException(HttpStatus.NOT_FOUND, 'FILE_MISSING', 'ไม่พบไฟล์ต้นฉบับ');
    }
    await this.audit.write({
      actorId: actor.id,
      action: 'DOCUMENT_DOWNLOAD',
      resourceType: 'beneficiary_document',
      resourceId: existing.id,
      metadata: { sizeBytes: bytes.length },
    });
    return {
      bytes,
      mimeType: existing.mimeType,
      fileName: existing.originalFileName,
    };
  }

  private async findActive(documentId: string) {
    const row = await this.prisma.beneficiaryDocument.findFirst({
      where: { id: documentId, deletedAt: null },
    });
    if (row === null) {
      throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'ไม่พบเอกสาร');
    }
    return row;
  }

  private resolve(storageKey: string): string {
    if (!/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(pdf|jpg|png)$/i.test(storageKey)) {
      throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'ไม่พบเอกสาร');
    }
    const root = path.resolve(this.storageRoot);
    const full = path.resolve(root, storageKey);
    if (!full.startsWith(root + path.sep)) {
      throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'ไม่พบเอกสาร');
    }
    return full;
  }

  private async fileAvailable(storageKey: string): Promise<boolean> {
    try {
      await access(this.resolve(storageKey));
      return true;
    } catch {
      return false;
    }
  }

  private toView(row: {
    id: string;
    beneficiaryId: string;
    documentType: string;
    originalFileName: string;
    sizeBytes: number;
    mimeType: string;
    status: DocumentStatus;
    createdAt: Date;
    reviewedAt: Date | null;
  }) {
    return {
      id: row.id,
      beneficiaryId: row.beneficiaryId,
      documentType: row.documentType,
      originalFileName: row.originalFileName,
      sizeBytes: row.sizeBytes,
      mimeType: row.mimeType,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      reviewedAt: row.reviewedAt === null ? null : row.reviewedAt.toISOString(),
    };
  }
}

function safeOriginalName(originalName: string): string {
  const base = path.basename(originalName.replaceAll('\0', '')).slice(0, 255);
  if (base.length === 0 || base === '.' || base === '..') {
    throw new AppException(HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', 'ข้อมูลไม่ถูกต้อง', [
      { field: 'file', message: 'ชื่อไฟล์ไม่ถูกต้อง' },
    ]);
  }
  return base;
}
