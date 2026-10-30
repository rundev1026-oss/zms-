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
exports.DocumentsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../common/current-user.decorator");
const permissions_decorator_1 = require("../common/permissions.decorator");
const request_dto_1 = require("../common/request.dto");
const documents_service_1 = require("./documents.service");
let DocumentsController = class DocumentsController {
    documents;
    constructor(documents) {
        this.documents = documents;
    }
    list(beneficiaryId) {
        return this.documents.list(beneficiaryId);
    }
    upload(beneficiaryId, dto, file, user) {
        return this.documents.upload(beneficiaryId, file === undefined
            ? undefined
            : { buffer: file.buffer, originalname: file.originalname, mimetype: file.mimetype }, dto.documentType, user);
    }
    review(documentId, dto, user) {
        return this.documents.review(documentId, dto, user);
    }
    remove(documentId, user) {
        return this.documents.remove(documentId, user);
    }
    async content(documentId, user) {
        const file = await this.documents.readContent(documentId, user);
        return new common_1.StreamableFile(file.bytes, {
            type: file.mimeType,
            disposition: `attachment; filename="${encodeURIComponent(file.fileName)}"`,
        });
    }
};
exports.DocumentsController = DocumentsController;
__decorate([
    (0, common_1.Get)('beneficiaries/:beneficiaryId/documents'),
    (0, permissions_decorator_1.RequirePermissions)('documents.read'),
    (0, swagger_1.ApiOperation)({ summary: 'รายการเอกสาร ไม่มี URL สาธารณะ' }),
    __param(0, (0, common_1.Param)('beneficiaryId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DocumentsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)('beneficiaries/:beneficiaryId/documents'),
    (0, permissions_decorator_1.RequirePermissions)('documents.write'),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiOperation)({ summary: 'อัปโหลดเอกสารไปที่เก็บส่วนตัว' }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { limits: { fileSize: 10 * 1024 * 1024 } })),
    __param(0, (0, common_1.Param)('beneficiaryId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.UploadedFile)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, request_dto_1.UploadDocumentDto, Object, Object]),
    __metadata("design:returntype", void 0)
], DocumentsController.prototype, "upload", null);
__decorate([
    (0, common_1.Patch)('documents/:documentId/review'),
    (0, permissions_decorator_1.RequirePermissions)('documents.review'),
    (0, swagger_1.ApiOperation)({ summary: 'ให้ผลตรวจเอกสาร' }),
    __param(0, (0, common_1.Param)('documentId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, request_dto_1.ReviewDocumentDto, Object]),
    __metadata("design:returntype", void 0)
], DocumentsController.prototype, "review", null);
__decorate([
    (0, common_1.Delete)('documents/:documentId'),
    (0, permissions_decorator_1.RequirePermissions)('documents.delete'),
    (0, swagger_1.ApiOperation)({ summary: 'ปิดใช้งานเอกสารโดยไม่ลบแถว' }),
    __param(0, (0, common_1.Param)('documentId', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], DocumentsController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)('documents/:documentId/content'),
    (0, permissions_decorator_1.RequirePermissions)('documents.read'),
    (0, swagger_1.ApiOperation)({ summary: 'ดาวน์โหลดเอกสารหลังตรวจสิทธิ์' }),
    __param(0, (0, common_1.Param)('documentId', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "content", null);
exports.DocumentsController = DocumentsController = __decorate([
    (0, swagger_1.ApiTags)('documents'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [documents_service_1.DocumentsService])
], DocumentsController);
//# sourceMappingURL=documents.controller.js.map