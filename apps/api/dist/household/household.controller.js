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
exports.HouseholdController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../common/current-user.decorator");
const permissions_decorator_1 = require("../common/permissions.decorator");
const request_dto_1 = require("../common/request.dto");
const household_service_1 = require("./household.service");
let HouseholdController = class HouseholdController {
    household;
    constructor(household) {
        this.household = household;
    }
    get(beneficiaryId, user) {
        return this.household.get(beneficiaryId, user);
    }
    replace(beneficiaryId, dto, user) {
        return this.household.replace(beneficiaryId, dto, user);
    }
};
exports.HouseholdController = HouseholdController;
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.RequirePermissions)('beneficiaries.read'),
    (0, swagger_1.ApiOperation)({ summary: 'ข้อมูลครัวเรือน' }),
    __param(0, (0, common_1.Param)('beneficiaryId', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], HouseholdController.prototype, "get", null);
__decorate([
    (0, common_1.Put)(),
    (0, permissions_decorator_1.RequirePermissions)('beneficiaries.write'),
    (0, swagger_1.ApiOperation)({ summary: 'บันทึกครัวเรือนทั้งชุด' }),
    __param(0, (0, common_1.Param)('beneficiaryId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, request_dto_1.UpsertHouseholdDto, Object]),
    __metadata("design:returntype", void 0)
], HouseholdController.prototype, "replace", null);
exports.HouseholdController = HouseholdController = __decorate([
    (0, swagger_1.ApiTags)('household'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('beneficiaries/:beneficiaryId/household'),
    __metadata("design:paramtypes", [household_service_1.HouseholdService])
], HouseholdController);
//# sourceMappingURL=household.controller.js.map