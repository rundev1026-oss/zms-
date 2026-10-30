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
exports.ReportsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../common/current-user.decorator");
const permissions_decorator_1 = require("../common/permissions.decorator");
const export_dto_1 = require("./export.dto");
const reports_dto_1 = require("./dto/reports.dto");
const reports_service_1 = require("./reports.service");
let ReportsController = class ReportsController {
    reports;
    constructor(reports) {
        this.reports = reports;
    }
    async exportBeneficiaries(query, user) {
        const file = await this.reports.exportBeneficiaries(query, user);
        return new common_1.StreamableFile(file.bytes, {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            disposition: `attachment; filename="${file.fileName}"`,
        });
    }
    getAsnafDistribution(query) {
        return this.reports.getAsnafDistributionReport(query);
    }
    getFinancialSummary(query) {
        return this.reports.getFinancialSummaryReport(query);
    }
    getMonthlyTrends(query) {
        return this.reports.getMonthlyTrendsReport(query);
    }
    getDemographics() {
        return this.reports.getDemographicsReport();
    }
    getExecutiveDashboard() {
        return this.reports.getExecutiveKpiDashboard();
    }
};
exports.ReportsController = ReportsController;
__decorate([
    (0, common_1.Get)('beneficiaries/export'),
    (0, permissions_decorator_1.RequirePermissions)('reports.export'),
    (0, swagger_1.ApiOperation)({
        summary: 'ส่งออก Excel จากทะเบียนที่ตรงตัวกรองทั้งหมด ไม่จำกัดแค่หน้าปัจจุบัน',
    }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [export_dto_1.ExportBeneficiariesQueryDto, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "exportBeneficiaries", null);
__decorate([
    (0, common_1.Get)('asnaf-distribution'),
    (0, permissions_decorator_1.RequirePermissions)('beneficiaries.read'),
    (0, swagger_1.ApiOperation)({ summary: 'รายงานการกระจายเงินสงเคราะห์ตาม 8 กลุ่มอัสนาฟ' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reports_dto_1.QueryReportDto]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getAsnafDistribution", null);
__decorate([
    (0, common_1.Get)('financial-summary'),
    (0, permissions_decorator_1.RequirePermissions)('beneficiaries.read'),
    (0, swagger_1.ApiOperation)({ summary: 'รายงานสรุปภาพรวมงบประมาณการเงินและกองทุน 3 ระดับ' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reports_dto_1.QueryReportDto]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getFinancialSummary", null);
__decorate([
    (0, common_1.Get)('monthly-trends'),
    (0, permissions_decorator_1.RequirePermissions)('beneficiaries.read'),
    (0, swagger_1.ApiOperation)({ summary: 'รายงานแนวโน้มคำร้องและการเบิกจ่ายรายเดือน' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reports_dto_1.QueryReportDto]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getMonthlyTrends", null);
__decorate([
    (0, common_1.Get)('demographics'),
    (0, permissions_decorator_1.RequirePermissions)('beneficiaries.read'),
    (0, swagger_1.ApiOperation)({ summary: 'รายงานสถิติประชากรศาสตร์ผู้รับซะกาตและกลุ่มเปราะบาง' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getDemographics", null);
__decorate([
    (0, common_1.Get)('executive-dashboard'),
    (0, permissions_decorator_1.RequirePermissions)('beneficiaries.read'),
    (0, swagger_1.ApiOperation)({ summary: 'แดชบอร์ดดัชนีชี้วัดหลักของผู้บริหาร (Executive KPIs)' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getExecutiveDashboard", null);
exports.ReportsController = ReportsController = __decorate([
    (0, swagger_1.ApiTags)('reports'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('reports'),
    __metadata("design:paramtypes", [reports_service_1.ReportsService])
], ReportsController);
//# sourceMappingURL=reports.controller.js.map