"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HouseholdModule = void 0;
const common_1 = require("@nestjs/common");
const audit_module_1 = require("../audit/audit.module");
const beneficiaries_module_1 = require("../beneficiaries/beneficiaries.module");
const household_controller_1 = require("./household.controller");
const household_service_1 = require("./household.service");
let HouseholdModule = class HouseholdModule {
};
exports.HouseholdModule = HouseholdModule;
exports.HouseholdModule = HouseholdModule = __decorate([
    (0, common_1.Module)({
        imports: [beneficiaries_module_1.BeneficiariesModule, audit_module_1.AuditModule],
        controllers: [household_controller_1.HouseholdController],
        providers: [household_service_1.HouseholdService],
    })
], HouseholdModule);
//# sourceMappingURL=household.module.js.map