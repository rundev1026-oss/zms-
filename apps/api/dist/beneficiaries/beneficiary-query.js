"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildBeneficiaryWhere = buildBeneficiaryWhere;
exports.summaryFilters = summaryFilters;
exports.toStatusSummary = toStatusSummary;
exports.buildBeneficiaryOrder = buildBeneficiaryOrder;
const shared_1 = require("@zms/shared");
const SORT_FIELDS = ['createdAt', 'registryNumber', 'lastName', 'status'];
function buildBeneficiaryWhere(filters) {
    const where = { deletedAt: null };
    if (filters.status !== undefined) {
        where.status = filters.status;
    }
    if (filters.province !== undefined && filters.province.length > 0) {
        where.addresses = { some: { province: filters.province } };
    }
    if (filters.asnafCategoryId !== undefined) {
        where.assessments = {
            some: { categoryId: filters.asnafCategoryId, decision: 'CONFIRMED' },
        };
    }
    if (filters.q !== undefined && filters.q.trim().length > 0) {
        const q = filters.q.trim();
        const or = [
            { registryNumber: { contains: q, mode: 'insensitive' } },
            { firstName: { contains: q, mode: 'insensitive' } },
            { lastName: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q } },
            { addresses: { some: { community: { contains: q, mode: 'insensitive' } } } },
        ];
        if (/^\d{13}$/.test(q)) {
            or.push({ identityNumberNormalized: q });
        }
        where.OR = or;
    }
    return where;
}
function summaryFilters(filters) {
    return {
        q: filters.q,
        asnafCategoryId: filters.asnafCategoryId,
        province: filters.province,
    };
}
function toStatusSummary(groups) {
    const counts = Object.fromEntries(shared_1.REGISTRY_STATUSES.map((status) => [status, 0]));
    for (const group of groups) {
        if (shared_1.REGISTRY_STATUSES.includes(group.status)) {
            counts[group.status] = group.count;
        }
    }
    const total = shared_1.REGISTRY_STATUSES.reduce((sum, status) => sum + counts[status], 0);
    return { total, counts };
}
function buildBeneficiaryOrder(sort) {
    const [rawField, rawDirection] = (sort ?? 'createdAt:desc').split(':');
    const field = SORT_FIELDS.find((item) => item === rawField) ?? 'createdAt';
    const direction = rawDirection === 'asc' ? 'asc' : 'desc';
    return { [field]: direction };
}
//# sourceMappingURL=beneficiary-query.js.map