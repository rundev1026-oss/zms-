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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BeneficiariesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../common/current-user.decorator");
const permissions_decorator_1 = require("../common/permissions.decorator");
const beneficiaries_service_1 = require("./beneficiaries.service");
const beneficiary_dto_1 = require("./beneficiary.dto");
let BeneficiariesController = class BeneficiariesController {
    beneficiaries;
    constructor(beneficiaries) {
        this.beneficiaries = beneficiaries;
    }
    create(dto, user) {
        return this.beneficiaries.create(dto, user);
    }
    list(query, user) {
        return this.beneficiaries.list({ ...query, status: query.status }, user);
    }
    summary(query) {
        return this.beneficiaries.summary(query);
    }
    get(id, user) {
        return this.beneficiaries.getById(id, user);
    }
    update(id, dto, user) {
        return this.beneficiaries.update(id, dto, user);
    }
    latestConsent(id, user) {
        return this.beneficiaries.latestConsent(id, user);
    }
    consent(id, dto, user) {
        return this.beneficiaries.addConsent(id, dto, user);
    }
};
exports.BeneficiariesController = BeneficiariesController;
__decorate([
    (0, common_1.Post)(),
    (0, permissions_decorator_1.RequirePermissions)('beneficiaries.write'),
    (0, swagger_1.ApiOperation)({ summary: 'สร้างร่างและออกเลขทะเบียนโดยระบบ' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [beneficiary_dto_1.CreateBeneficiaryDto, Object]),
    __metadata("design:returntype", void 0)
], BeneficiariesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.RequirePermissions)('beneficiaries.read'),
    (0, swagger_1.ApiOperation)({ summary: 'รายการทะเบียนพร้อมตัวกรอง เรียงลำดับ และแบ่งหน้า' }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [beneficiary_dto_1.BeneficiaryListQueryDto, Object]),
    __metadata("design:returntype", void 0)
], BeneficiariesController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('summary'),
    (0, permissions_decorator_1.RequirePermissions)('beneficiaries.read'),
    (0, swagger_1.ApiOperation)({
        summary: 'จำนวนทะเบียนตามสถานะ ด้วยเงื่อนไขค้นหาเดียวกับรายการ และไม่นับเฉพาะแถวในหน้าปัจจุบัน',
    }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [beneficiary_dto_1.BeneficiarySummaryQueryDto]),
    __metadata("design:returntype", void 0)
], BeneficiariesController.prototype, "summary", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permissions_decorator_1.RequirePermissions)('beneficiaries.read'),
    (0, swagger_1.ApiOperation)({ summary: 'รายละเอียดทะเบียน เลขบัตรถูกปกปิดถ้าไม่มีสิทธิ์' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], BeneficiariesController.prototype, "get", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, permissions_decorator_1.RequirePermissions)('beneficiaries.write'),
    (0, swagger_1.ApiOperation)({ summary: 'บันทึกร่าง ห้ามส่งสถานะหรือตัวตนของผู้ใช้มาจากไคลเอนต์' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, beneficiary_dto_1.UpdateBeneficiaryDto, Object]),
    __metadata("design:returntype", void 0)
], BeneficiariesController.prototype, "update", null);
__decorate([
    (0, common_1.Get)(':id/consents/latest'),
    (0, permissions_decorator_1.RequirePermissions)('beneficiaries.read'),
    (0, swagger_1.ApiOperation)({ summary: 'ความยินยอมล่าสุดสำหรับเปิดร่างต่อ ไม่ทับประวัติเดิม' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], BeneficiariesController.prototype, "latestConsent", null);
__decorate([
    (0, common_1.Post)(':id/consents'),
    (0, permissions_decorator_1.RequirePermissions)('beneficiaries.write'),
    (0, swagger_1.ApiOperation)({ summary: 'เพิ่มแถวความยินยอมใหม่โดยไม่ทับแถวเดิม' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, beneficiary_dto_1.CreateConsentDto, Object]),
    __metadata("design:returntype", void 0)
], BeneficiariesController.prototype, "consent", null);
exports.BeneficiariesController = BeneficiariesController = __decorate([
    (0, swagger_1.ApiTags)('beneficiaries'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('beneficiaries'),
    __metadata("design:paramtypes", [beneficiaries_service_1.BeneficiariesService])
], BeneficiariesController);
//# sourceMappingURL=beneficiaries.controller.js.map