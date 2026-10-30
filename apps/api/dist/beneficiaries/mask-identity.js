"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.maskIdentityNumber = maskIdentityNumber;
function maskIdentityNumber(value) {
    if (value === null || value.length === 0) {
        return null;
    }
    if (value.length <= 4) {
        return '••••';
    }
    return `${value.slice(0, 1)}${'•'.repeat(value.length - 3)}${value.slice(-2)}`;
}
//# sourceMappingURL=mask-identity.js.map