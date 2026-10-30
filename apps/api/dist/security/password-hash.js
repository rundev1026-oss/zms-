"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
const node_crypto_1 = require("node:crypto");
const KEY_LENGTH = 64;
const SCHEME = 'scrypt';
function hashPassword(password) {
    if (password.length < 8) {
        throw new Error('Password must be at least 8 characters');
    }
    const salt = (0, node_crypto_1.randomBytes)(16).toString('base64url');
    const hash = (0, node_crypto_1.scryptSync)(password, salt, KEY_LENGTH).toString('base64url');
    return `${SCHEME}$${salt}$${hash}`;
}
function verifyPassword(password, encoded) {
    const [scheme, salt, hash] = encoded.split('$');
    if (scheme !== SCHEME || salt === undefined || salt.length === 0 || hash === undefined) {
        return false;
    }
    const actual = (0, node_crypto_1.scryptSync)(password, salt, KEY_LENGTH);
    const expected = Buffer.from(hash, 'base64url');
    if (actual.length !== expected.length) {
        return false;
    }
    return (0, node_crypto_1.timingSafeEqual)(actual, expected);
}
//# sourceMappingURL=password-hash.js.map