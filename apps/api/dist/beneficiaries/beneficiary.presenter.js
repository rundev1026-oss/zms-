"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.beneficiaryInclude = void 0;
exports.presentBeneficiary = presentBeneficiary;
const beneficiary_fields_1 = require("./beneficiary-fields");
const mask_identity_1 = require("./mask-identity");
exports.beneficiaryInclude = {
    addresses: true,
    assessments: {
        where: { decision: 'CONFIRMED' },
        orderBy: { assessedAt: 'desc' },
        take: 1,
        include: { category: true },
    },
};
function presentBeneficiary(row, options) {
    const current = row.addresses.find((address) => address.addressType === 'CURRENT');
    const registered = row.addresses.find((address) => address.addressType === 'REGISTERED');
    const place = current ?? registered ?? null;
    const confirmed = row.assessments[0];
    const dateOfBirth = row.dateOfBirth === null ? null : row.dateOfBirth.toISOString().slice(0, 10);
    const view = {
        id: row.id,
        registryNumber: row.registryNumber,
        status: row.status,
        title: row.title,
        firstName: row.firstName,
        lastName: row.lastName,
        identityType: row.identityType,
        identityNumber: options.revealIdentity
            ? row.identityNumber
            : (0, mask_identity_1.maskIdentityNumber)(row.identityNumber),
        dateOfBirth,
        ageYears: dateOfBirth === null ? null : (0, beneficiary_fields_1.completedAgeYears)(dateOfBirth, new Date()),
        phone: row.phone,
        occupation: row.occupation,
        maritalStatus: row.maritalStatus,
        registrationNote: row.registrationNote,
        province: place?.province ?? null,
        community: place?.community ?? null,
        asnaf: confirmed === undefined
            ? null
            : {
                id: confirmed.category.id,
                code: confirmed.category.code,
                nameTh: confirmed.category.nameTh,
            },
        requestCount: 0,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
    if (options.revealAid) {
        view.aidTotal = '0.00';
    }
    return view;
}
//# sourceMappingURL=beneficiary.presenter.js.map