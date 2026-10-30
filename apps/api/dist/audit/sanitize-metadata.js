"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeMetadata = sanitizeMetadata;
const FORBIDDEN_KEYS = new Set([
    'password',
    'passwordhash',
    'token',
    'refreshtoken',
    'accesstoken',
    'identitynumber',
    'identitynumbernormalized',
    'file',
    'filebytes',
]);
function sanitizeMetadata(input) {
    if (input === undefined) {
        return undefined;
    }
    const metadata = {};
    for (const [key, value] of Object.entries(input)) {
        if (FORBIDDEN_KEYS.has(key.toLowerCase())) {
            continue;
        }
        if (typeof value === 'string' && /\d{13}/.test(value)) {
            continue;
        }
        metadata[key] = value;
    }
    return metadata;
}
//# sourceMappingURL=sanitize-metadata.js.map