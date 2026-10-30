"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddressesService = void 0;
const common_1 = require("@nestjs/common");
const audit_service_1 = require("../audit/audit.service");
const beneficiaries_service_1 = require("../beneficiaries/beneficiaries.service");
const app_exception_1 = require("../common/app.exception");
const prisma_service_1 = require("../prisma/prisma.service");
let AddressesService = class AddressesService {
    prisma;
    beneficiaries;
    audit;
    constructor(prisma, beneficiaries, audit) {
        this.prisma = prisma;
        this.beneficiaries = beneficiaries;
        this.audit = audit;
    }
    async list(beneficiaryId, actor) {
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
    async replace(beneficiaryId, addresses, actor) {
        const beneficiary = await this.beneficiaries.requireRecord(beneficiaryId);
        this.beneficiaries.assertEditable(beneficiary.status);
        const types = addresses.map((address) => address.addressType);
        if (new Set(types).size !== types.length) {
            throw new app_exception_1.AppException(common_1.HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', 'ข้อมูลไม่ถูกต้อง', [
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
                rows.push(await tx.beneficiaryAddress.upsert({
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
                }));
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
    assertCoordinate(latitude, longitude) {
        if (latitude !== undefined && (latitude < -90 || latitude > 90)) {
            throw new app_exception_1.AppException(common_1.HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', 'ข้อมูลไม่ถูกต้อง', [
                { field: 'latitude', message: 'ละติจูดไม่ถูกต้อง' },
            ]);
        }
        if (longitude !== undefined && (longitude < -180 || longitude > 180)) {
            throw new app_exception_1.AppException(common_1.HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', 'ข้อมูลไม่ถูกต้อง', [
                { field: 'longitude', message: 'ลองจิจูดไม่ถูกต้อง' },
            ]);
        }
    }
    toView(row) {
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
};
exports.AddressesService = AddressesService;
exports.AddressesService = AddressesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        beneficiaries_service_1.BeneficiariesService,
        audit_service_1.AuditService])
], AddressesService);
//# sourceMappingURL=addresses.service.js.map