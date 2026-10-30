"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegistryWorkflowModule = void 0;
const common_1 = require("@nestjs/common");
const audit_module_1 = require("../audit/audit.module");
const beneficiaries_module_1 = require("../beneficiaries/beneficiaries.module");
const registry_workflow_controller_1 = require("./registry-workflow.controller");
const registry_workflow_service_1 = require("./registry-workflow.service");
let RegistryWorkflowModule = class RegistryWorkflowModule {
};
exports.RegistryWorkflowModule = RegistryWorkflowModule;
exports.RegistryWorkflowModule = RegistryWorkflowModule = __decorate([
    (0, common_1.Module)({
        imports: [beneficiaries_module_1.BeneficiariesModule, audit_module_1.AuditModule],
        controllers: [registry_workflow_controller_1.RegistryWorkflowController],
        providers: [registry_workflow_service_1.RegistryWorkflowService],
    })
], RegistryWorkflowModule);
//# sourceMappingURL=registry-workflow.module.js.map