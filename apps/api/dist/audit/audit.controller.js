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
exports.AuditController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const permissions_decorator_1 = require("../common/permissions.decorator");
const audit_query_dto_1 = require("./dto/audit-query.dto");
const audit_service_1 = require("./audit.service");
let AuditController = class AuditController {
    audit;
    constructor(audit) {
        this.audit = audit;
    }
    list(query) {
        return this.audit.list(query);
    }
    getSummary() {
        return this.audit.getSummary();
    }
    getById(id) {
        return this.audit.getById(id);
    }
};
exports.AuditController = AuditController;
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.RequirePermissions)('audit.read'),
    (0, swagger_1.ApiOperation)({ summary: 'ค้นหาและเรียกดูประวัติการปฏิบัติงาน (Audit Trail)' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [audit_query_dto_1.QueryAuditLogsDto]),
    __metadata("design:returntype", void 0)
], AuditController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('summary'),
    (0, permissions_decorator_1.RequirePermissions)('audit.read'),
    (0, swagger_1.ApiOperation)({ summary: 'สรุปภาพรวมสถิติการปฏิบัติงานตามประเภทกิจกรรม' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AuditController.prototype, "getSummary", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permissions_decorator_1.RequirePermissions)('audit.read'),
    (0, swagger_1.ApiOperation)({ summary: 'ดูรายละเอียดบันทึกประวัติการทำงานตามรหัส' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AuditController.prototype, "getById", null);
exports.AuditController = AuditController = __decorate([
    (0, swagger_1.ApiTags)('audit'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('audit-logs'),
    __metadata("design:paramtypes", [audit_service_1.AuditService])
], AuditController);
//# sourceMappingURL=audit.controller.js.map