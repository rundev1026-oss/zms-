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
exports.UpdateRolePermissionsDto = exports.CloneRoleDto = exports.UpdateRoleDto = exports.CreateRoleDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CreateRoleDto {
    code;
    name;
    description;
    permissions;
}
exports.CreateRoleDto = CreateRoleDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'BRANCH_REGISTRY_OFFICER' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateRoleDto.prototype, "code", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'เจ้าหน้าที่ทะเบียนสาขา' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateRoleDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateRoleDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: [String] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CreateRoleDto.prototype, "permissions", void 0);
class UpdateRoleDto {
    name;
    description;
    status;
}
exports.UpdateRoleDto = UpdateRoleDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateRoleDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateRoleDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ['ACTIVE', 'INACTIVE'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['ACTIVE', 'INACTIVE']),
    __metadata("design:type", String)
], UpdateRoleDto.prototype, "status", void 0);
class CloneRoleDto {
    newCode;
    code;
    newName;
    name;
    description;
}
exports.CloneRoleDto = CloneRoleDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'BRANCH_APPROVER' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CloneRoleDto.prototype, "newCode", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'BRANCH_APPROVER' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CloneRoleDto.prototype, "code", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'ผู้อนุมัติระดับสาขา' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CloneRoleDto.prototype, "newName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'ผู้อนุมัติระดับสาขา' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CloneRoleDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CloneRoleDto.prototype, "description", void 0);
class UpdateRolePermissionsDto {
    permissionCodes;
    permissions;
    reason;
}
exports.UpdateRolePermissionsDto = UpdateRolePermissionsDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: [String] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], UpdateRolePermissionsDto.prototype, "permissionCodes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: [String] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], UpdateRolePermissionsDto.prototype, "permissions", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateRolePermissionsDto.prototype, "reason", void 0);
//# sourceMappingURL=roles.dto.js.map