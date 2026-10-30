"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidThaiNationalId = isValidThaiNationalId;
exports.normalizeIdentityNumber = normalizeIdentityNumber;
function isValidThaiNationalId(value) {
    if (!/^\d{13}$/.test(value)) {
        return false;
    }
    let sum = 0;
    for (let index = 0; index < 12; index += 1) {
        sum += Number(value[index]) * (13 - index);
    }
    const check = (11 - (sum % 11)) % 10;
    return check === Number(value[12]);
}
function normalizeIdentityNumber(value) {
    return value.replace(/[\s-]/g, '').trim();
}
//# sourceMappingURL=identity.js.map