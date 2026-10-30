import { HttpStatus, Injectable } from '@nestjs/common';
import type { AddressType, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { BeneficiariesService } from '../beneficiaries/beneficiaries.service';
import { AppException } from '../common/app.exception';
import type { AuthUser } from '../common/auth-user';
import { PrismaService } from '../prisma/prisma.service';

export interface AddressInput {
  addressType: AddressType;
  addressLine?: string;
  community?: string;
  subdistrict?: string;
  district?: string;
  province?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
}

@Injectable()
export class AddressesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly beneficiaries: BeneficiariesService,
    private readonly audit: AuditService,
  ) {}

  async list(beneficiaryId: string, actor: AuthUser) {
    await this.beneficiaries.requireRecord(beneficiaryId);
    const rows = await this.prisma.beneficiaryAddress.findMany({
      where: { beneficiaryId },
      orderBy: { addressType: 'asc' },
    });
    await this.audit.write({
      actorId: actor.id,
      action: 'ADDRESS_VIEW',
      resourceType: 'beneficiary',
      resourceId: beneficiaryId,
      metadata: { count: rows.length },
    });
    return rows.map((row) => this.toView(row));
  }

  async replace(beneficiaryId: string, addresses: AddressInput[], actor: AuthUser) {
    const beneficiary = await this.beneficiaries.requireRecord(beneficiaryId);
    this.beneficiaries.assertEditable(beneficiary.status);
    const types = addresses.map((address) => address.addressType);
    if (new Set(types).size !== types.length) {
      throw new AppException(HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', 'ข้อมูลไม่ถูกต้อง', [
        { field: 'addresses', message: 'ประเภทที่อยู่ซ้ำกัน' },
      ]);
    }
    for (const address of addresses) {
      this.assertCoordinate(address.latitude, address.longitude);
    }

    const saved = await this.prisma.$transaction(async (tx) => {
      const rows = [];
      for (const address of addresses) {
        const fields = {
          addressLine: address.addressLine ?? null,
          community: address.community ?? null,
          subdistrict: address.subdistrict ?? null,
          district: address.district ?? null,
          province: address.province ?? null,
          postalCode: address.postalCode ?? null,
          latitude: address.latitude ?? null,
          longitude: address.longitude ?? null,
          updatedById: actor.id,
        };
        rows.push(
          await tx.beneficiaryAddress.upsert({
            where: {
              beneficiaryId_addressType: { beneficiaryId, addressType: address.addressType },
            },
            create: {
              beneficiaryId,
              addressType: address.addressType,
              ...fields,
              createdById: actor.id,
            },
            update: fields,
          }),
        );
      }
      await this.audit.record(tx, {
        actorId: actor.id,
        action: 'ADDRESS_UPDATE',
        resourceType: 'beneficiary',
        resourceId: beneficiaryId,
        metadata: { count: addresses.length },
      });
      return rows;
    });
    return saved.map((row) => this.toView(row));
  }

  private assertCoordinate(latitude?: number, longitude?: number): void {
    if (latitude !== undefined && (latitude < -90 || latitude > 90)) {
      throw new AppException(HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', 'ข้อมูลไม่ถูกต้อง', [
        { field: 'latitude', message: 'ละติจูดไม่ถูกต้อง' },
      ]);
    }
    if (longitude !== undefined && (longitude < -180 || longitude > 180)) {
      throw new AppException(HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', 'ข้อมูลไม่ถูกต้อง', [
        { field: 'longitude', message: 'ลองจิจูดไม่ถูกต้อง' },
      ]);
    }
  }

  private toView(row: {
    id: string;
    addressType: AddressType;
    addressLine: string | null;
    community: string | null;
    subdistrict: string | null;
    district: string | null;
    province: string | null;
    postalCode: string | null;
    latitude: Prisma.Decimal | null;
    longitude: Prisma.Decimal | null;
  }) {
    return {
      id: row.id,
      addressType: row.addressType,
      addressLine: row.addressLine,
      community: row.community,
      subdistrict: row.subdistrict,
      district: row.district,
      province: row.province,
      postalCode: row.postalCode,
      latitude: row.latitude === null ? null : row.latitude.toString(),
      longitude: row.longitude === null ? null : row.longitude.toString(),
    };
  }
}
