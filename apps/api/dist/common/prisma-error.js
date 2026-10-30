"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isUniqueConflict = isUniqueConflict;
function isUniqueConflict(error) {
    if (typeof error !== 'object' || error === null || !('code' in error)) {
        return null;
    }
    if (error.code !== 'P2002') {
        return null;
    }
    const meta = 'meta' in error ? error.meta : undefined;
    return JSON.stringify(meta?.target ?? '');
}
//# sourceMappingURL=prisma-error.js.map