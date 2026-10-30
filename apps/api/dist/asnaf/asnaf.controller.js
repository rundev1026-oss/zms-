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
exports.AsnafController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const permissions_decorator_1 = require("../common/permissions.decorator");
const asnaf_service_1 = require("./asnaf.service");
let AsnafController = class AsnafController {
    asnaf;
    constructor(asnaf) {
        this.asnaf = asnaf;
    }
    list() {
        return this.asnaf.listActive();
    }
};
exports.AsnafController = AsnafController;
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.RequirePermissions)('beneficiaries.read'),
    (0, swagger_1.ApiOperation)({ summary: 'หมวดอัสนัฟที่เปิดใช้งาน ระบบไม่ตัดสินคุณสมบัติจากหมวดนี้เอง' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AsnafController.prototype, "list", null);
exports.AsnafController = AsnafController = __decorate([
    (0, swagger_1.ApiTags)('asnaf'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('asnaf/categories'),
    __metadata("design:paramtypes", [asnaf_service_1.AsnafService])
], AsnafController);
//# sourceMappingURL=asnaf.controller.js.map