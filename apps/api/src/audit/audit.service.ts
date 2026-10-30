import { Injectable, HttpStatus } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { sanitizeMetadata } from './sanitize-metadata';
import { AppException } from '../common/app.exception';
import { QueryAuditLogsDto } from './dto/audit-query.dto';

export interface AuditEntry {
  actorId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata?: Record<string, string | number | boolean | null>;
}

type AuditWriter = PrismaService | Prisma.TransactionClient;

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  write(entry: AuditEntry): Promise<void> {
    return this.record(this.prisma, entry);
  }

  async record(writer: AuditWriter, entry: AuditEntry): Promise<void> {
    await writer.auditLog.create({
      data: {
        actorId: entry.actorId,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        metadata: sanitizeMetadata(entry.metadata),
      },
    });
  }

  /**
   * List audit logs with comprehensive filters, search and pagination
   */
  async list(query: QueryAuditLogsDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 15));
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {};

    if (query.action) {
      where.action = { contains: query.action, mode: 'insensitive' };
    }

    if (query.resourceType) {
      where.resourceType = query.resourceType;
    }

    if (query.resourceId) {
      where.resourceId = query.resourceId;
    }

    if (query.actorId) {
      where.actorId = query.actorId;
    }

    if (query.search) {
      where.OR = [
        { action: { contains: query.search, mode: 'insensitive' } },
        { resourceType: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          actor: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
        },
      }),
    ]);

    return {
      items: items.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      })),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get single audit log record by ID
   */
  async getById(id: string) {
    const log = await this.prisma.auditLog.findUnique({
      where: { id },
      include: {
        actor: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
    });

    if (!log) {
      throw new AppException(HttpStatus.NOT_FOUND, 'AUDIT_LOG_NOT_FOUND', `ไม่พบบันทึกประวัติการทำงานรหัส ${id}`);
    }

    return {
      ...log,
      createdAt: log.createdAt.toISOString(),
    };
  }

  /**
   * Get audit activity statistical summary
   */
  async getSummary() {
    const [totalLogs, topActions] = await Promise.all([
      this.prisma.auditLog.count(),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        _count: { action: true },
        orderBy: { _count: { action: 'desc' } },
        take: 8,
      }),
    ]);

    return {
      totalAuditLogs: totalLogs,
      topActions: topActions.map((a) => ({
        action: a.action,
        count: a._count.action,
      })),
      timestamp: new Date().toISOString(),
    };
  }
}
