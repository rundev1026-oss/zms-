"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.missingSubmitFields = missingSubmitFields;
const identity_1 = require("../beneficiaries/identity");
function missingSubmitFields(input) {
    const details = [];
    if (input.firstName.trim().length === 0) {
        details.push({ field: 'firstName', message: 'กรุณากรอกชื่อ' });
    }
    if (input.lastName.trim().length === 0) {
        details.push({ field: 'lastName', message: 'กรุณากรอกนามสกุล' });
    }
    if (input.identityNumber === null || input.identityNumber.trim().length === 0) {
        details.push({ field: 'identityNumber', message: 'กรุณากรอกเลขประจำตัว' });
    }
    else if (input.identityType === 'THAI_NATIONAL_ID' &&
        !(0, identity_1.isValidThaiNationalId)(input.identityNumber)) {
        details.push({ field: 'identityNumber', message: 'เลขประจำตัวประชาชนไม่ถูกต้อง' });
    }
    if (input.dateOfBirth === null) {
        details.push({ field: 'dateOfBirth', message: 'กรุณากรอกวันเกิด' });
    }
    if (input.phone === null || input.phone.trim().length === 0) {
        details.push({ field: 'phone', message: 'กรุณากรอกหมายเลขโทรศัพท์' });
    }
    if (input.addressCountWithArea < 1) {
        details.push({ field: 'addresses', message: 'กรุณากรอกที่อยู่ให้มีจังหวัด อำเภอ และตำบล' });
    }
    if (!input.hasHousehold) {
        details.push({ field: 'household', message: 'กรุณาบันทึกข้อมูลครัวเรือน' });
    }
    if (!input.hasAcceptedConsent) {
        details.push({ field: 'consent', message: 'กรุณายืนยันความยินยอมก่อนส่งตรวจ' });
    }
    return details;
}
//# sourceMappingURL=completeness.js.map