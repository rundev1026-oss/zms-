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
exports.AddressesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../common/current-user.decorator");
const permissions_decorator_1 = require("../common/permissions.decorator");
const request_dto_1 = require("../common/request.dto");
const addresses_service_1 = require("./addresses.service");
let AddressesController = class AddressesController {
    addresses;
    constructor(addresses) {
        this.addresses = addresses;
    }
    list(beneficiaryId, user) {
        return this.addresses.list(beneficiaryId, user);
    }
    replace(beneficiaryId, dto, user) {
        return this.addresses.replace(beneficiaryId, dto.addresses, user);
    }
};
exports.AddressesController = AddressesController;
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.RequirePermissions)('beneficiaries.read'),
    (0, swagger_1.ApiOperation)({ summary: 'ที่อยู่ตามทะเบียนบ้านและที่อยู่ปัจจุบัน' }),
    __param(0, (0, common_1.Param)('beneficiaryId', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AddressesController.prototype, "list", null);
__decorate([
    (0, common_1.Put)(),
    (0, permissions_decorator_1.RequirePermissions)('beneficiaries.write'),
    (0, swagger_1.ApiOperation)({ summary: 'บันทึกที่อยู่' }),
    __param(0, (0, common_1.Param)('beneficiaryId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, request_dto_1.ReplaceAddressesDto, Object]),
    __metadata("design:returntype", void 0)
], AddressesController.prototype, "replace", null);
exports.AddressesController = AddressesController = __decorate([
    (0, swagger_1.ApiTags)('addresses'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('beneficiaries/:beneficiaryId/addresses'),
    __metadata("design:paramtypes", [addresses_service_1.AddressesService])
], AddressesController);
//# sourceMappingURL=addresses.controller.js.map