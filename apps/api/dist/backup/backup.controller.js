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
exports.BackupController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const roles_decorator_1 = require("../common/roles.decorator");
const current_user_decorator_1 = require("../common/current-user.decorator");
const backup_service_1 = require("./backup.service");
const backup_dto_1 = require("./dto/backup.dto");
let BackupController = class BackupController {
    backupService;
    constructor(backupService) {
        this.backupService = backupService;
    }
    createBackup(dto, user) {
        return this.backupService.createBackup(dto, user);
    }
    getBackupHistory() {
        return this.backupService.getBackupHistory();
    }
    verifyDatabaseIntegrity() {
        return this.backupService.verifyDatabaseIntegrity();
    }
};
exports.BackupController = BackupController;
__decorate([
    (0, common_1.Post)('create'),
    (0, roles_decorator_1.Roles)('SUPER_ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'สร้างจุดสำรองข้อมูลฐานข้อมูลและสแนปช็อตระเบียน (Database Backup Snapshot)' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [backup_dto_1.CreateBackupDto, Object]),
    __metadata("design:returntype", void 0)
], BackupController.prototype, "createBackup", null);
__decorate([
    (0, common_1.Get)('history'),
    (0, roles_decorator_1.Roles)('SUPER_ADMIN', 'AUDITOR', 'FINANCE_OFFICER'),
    (0, swagger_1.ApiOperation)({ summary: 'ประวัติและรายการจุดสำรองข้อมูลฐานข้อมูลทั้งหมด' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], BackupController.prototype, "getBackupHistory", null);
__decorate([
    (0, common_1.Get)('verify'),
    (0, roles_decorator_1.Roles)('SUPER_ADMIN', 'AUDITOR'),
    (0, swagger_1.ApiOperation)({ summary: 'ตรวจสอบความสมบูรณ์เชิงสัมพันธ์และเสถียรภาพฐานข้อมูล (Integrity Verification)' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], BackupController.prototype, "verifyDatabaseIntegrity", null);
exports.BackupController = BackupController = __decorate([
    (0, swagger_1.ApiTags)('backup'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('backup'),
    __metadata("design:paramtypes", [backup_service_1.BackupService])
], BackupController);
//# sourceMappingURL=backup.controller.js.map