"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readIdentity = readIdentity;
exports.completedAgeYears = completedAgeYears;
exports.readDateOfBirth = readDateOfBirth;
const common_1 = require("@nestjs/common");
const app_exception_1 = require("../common/app.exception");
const identity_1 = require("./identity");
function readIdentity(identityType, raw) {
    if (raw === undefined || raw === null || raw.trim().length === 0) {
        return { identityNumber: null, identityNumberNormalized: null };
    }
    const normalized = (0, identity_1.normalizeIdentityNumber)(raw);
    if (identityType === 'THAI_NATIONAL_ID' && !(0, identity_1.isValidThaiNationalId)(normalized)) {
        throw new app_exception_1.AppException(common_1.HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', 'ข้อมูลไม่ถูกต้อง', [
            { field: 'identityNumber', message: 'เลขประจำตัวประชาชนไม่ถูกต้อง' },
        ]);
    }
    if (normalized.length > 50) {
        throw new app_exception_1.AppException(common_1.HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', 'ข้อมูลไม่ถูกต้อง', [
            { field: 'identityNumber', message: 'เลขประจำตัวยาวเกินไป' },
        ]);
    }
    return { identityNumber: normalized, identityNumberNormalized: normalized };
}
function completedAgeYears(isoDate, today) {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
    if (match === null) {
        return null;
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) {
        return null;
    }
    let age = today.getUTCFullYear() - year;
    const todayMonth = today.getUTCMonth() + 1;
    const todayDay = today.getUTCDate();
    if (todayMonth < month || (todayMonth === month && todayDay < day)) {
        age -= 1;
    }
    return age >= 0 && age <= 130 ? age : null;
}
function readDateOfBirth(raw) {
    if (raw === undefined || raw === null || raw.length === 0) {
        return null;
    }
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
        throw new app_exception_1.AppException(common_1.HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', 'ข้อมูลไม่ถูกต้อง', [
            { field: 'dateOfBirth', message: 'วันเกิดไม่ถูกต้อง' },
        ]);
    }
    const today = new Date();
    today.setUTCHours(23, 59, 59, 999);
    if (date.getTime() > today.getTime()) {
        throw new app_exception_1.AppException(common_1.HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', 'ข้อมูลไม่ถูกต้อง', [
            { field: 'dateOfBirth', message: 'วันเกิดต้องไม่เป็นวันในอนาคต' },
        ]);
    }
    return date;
}
//# sourceMappingURL=beneficiary-fields.js.map