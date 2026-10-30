"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectAllowedFile = detectAllowedFile;
exports.extensionForKind = extensionForKind;
exports.mimeForKind = mimeForKind;
const MAX_BYTES = 10 * 1024 * 1024;
function detectAllowedFile(buffer) {
    if (buffer.length === 0 || buffer.length > MAX_BYTES) {
        return null;
    }
    if (buffer.subarray(0, 4).toString('utf8') === '%PDF') {
        return 'pdf';
    }
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return 'jpg';
    }
    if (buffer.length >= 8 &&
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47) {
        return 'png';
    }
    return null;
}
function extensionForKind(kind) {
    return kind === 'jpg' ? 'jpg' : kind;
}
function mimeForKind(kind) {
    if (kind === 'pdf') {
        return 'application/pdf';
    }
    if (kind === 'jpg') {
        return 'image/jpeg';
    }
    return 'image/png';
}
//# sourceMappingURL=file-signature.js.map