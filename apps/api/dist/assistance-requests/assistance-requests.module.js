"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssistanceRequestsModule = void 0;
const common_1 = require("@nestjs/common");
const audit_module_1 = require("../audit/audit.module");
const assessment_module_1 = require("../assessment/assessment.module");
const assistance_requests_service_1 = require("./assistance-requests.service");
const assistance_requests_controller_1 = require("./assistance-requests.controller");
let AssistanceRequestsModule = class AssistanceRequestsModule {
};
exports.AssistanceRequestsModule = AssistanceRequestsModule;
exports.AssistanceRequestsModule = AssistanceRequestsModule = __decorate([
    (0, common_1.Module)({
        imports: [audit_module_1.AuditModule, assessment_module_1.AssessmentModule],
        controllers: [assistance_requests_controller_1.AssistanceRequestsController],
        providers: [assistance_requests_service_1.AssistanceRequestsService],
        exports: [assistance_requests_service_1.AssistanceRequestsService],
    })
], AssistanceRequestsModule);
//# sourceMappingURL=assistance-requests.module.js.map