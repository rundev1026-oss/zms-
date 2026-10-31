"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.beneficiaryInclude = void 0;
exports.presentBeneficiary = presentBeneficiary;
const beneficiary_fields_1 = require("./beneficiary-fields");
const mask_identity_1 = require("./mask-identity");
exports.beneficiaryInclude = {
    addresses: true,
    household: {
        include: {
            members: { orderBy: { sortOrder: 'asc' } },
        },
    },
    incomeProfile: true,
    documents: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
    },
    assessments: {
        where: { decision: 'CONFIRMED' },
        orderBy: { assessedAt: 'desc' },
        take: 1,
        include: { category: true },
    },
    deletedBy: {
        select: { id: true, displayName: true, email: true },
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
        addresses: row.addresses,
        household: row.household
            ? {
                ...row.household,
                householdIncome: row.household.householdIncome?.toFixed(2) ?? null,
                householdExpense: row.household.householdExpense?.toFixed(2) ?? null,
                debtAmount: row.household.debtAmount?.toFixed(2) ?? null,
                latitude: row.household.latitude ? Number(row.household.latitude) : null,
                longitude: row.household.longitude ? Number(row.household.longitude) : null,
                members: (row.household.members || []).map((m) => ({
                    ...m,
                    dateOfBirth: m.dateOfBirth === null ? null : m.dateOfBirth.toISOString().slice(0, 10),
                })),
            }
            : null,
        incomeProfile: row.incomeProfile
            ? {
                ...row.incomeProfile,
                personalIncome: row.incomeProfile.personalIncome?.toFixed(2) ?? null,
                regularExpense: row.incomeProfile.regularExpense?.toFixed(2) ?? null,
                debtBurden: row.incomeProfile.debtBurden?.toFixed(2) ?? null,
            }
            : null,
        documents: (row.documents || []).map((d) => ({
            id: d.id,
            name: d.originalFileName,
            fileName: d.originalFileName,
            documentType: d.documentType,
            category: d.documentType,
            fileSize: d.sizeBytes,
            mimeType: d.mimeType,
            status: d.status,
            fileUrl: `/api/documents/${d.id}/download`,
        })),
        deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
        deletedById: row.deletedById ?? null,
        deletedByName: row.deletedBy ? (row.deletedBy.displayName || row.deletedBy.email) : null,
        deletionReason: row.deletionReason ?? null,
        deletionReference: row.deletionReference ?? null,
        deletionStatus: row.deletionStatus ?? false,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
    if (options.revealAid) {
        view.aidTotal = '0.00';
    }
    return view;
}
//# sourceMappingURL=beneficiary.presenter.js.map