"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateBase32Secret = generateBase32Secret;
exports.base32Decode = base32Decode;
exports.generateTotp = generateTotp;
exports.verifyTotp = verifyTotp;
exports.generateRecoveryCodes = generateRecoveryCodes;
exports.generateOtpAuthUri = generateOtpAuthUri;
const node_crypto_1 = require("node:crypto");
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function generateBase32Secret(length = 20) {
    const bytes = (0, node_crypto_1.randomBytes)(length);
    let bits = 0;
    let value = 0;
    let output = '';
    for (let i = 0; i < bytes.length; i++) {
        value = (value << 8) | bytes[i];
        bits += 8;
        while (bits >= 5) {
            output += BASE32_CHARS[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }
    if (bits > 0) {
        output += BASE32_CHARS[(value << (5 - bits)) & 31];
    }
    return output;
}
function base32Decode(input) {
    const cleaned = input.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
    let bits = 0;
    let value = 0;
    const bytes = [];
    for (let i = 0; i < cleaned.length; i++) {
        const idx = BASE32_CHARS.indexOf(cleaned[i]);
        if (idx === -1)
            continue;
        value = (value << 5) | idx;
        bits += 5;
        if (bits >= 8) {
            bytes.push((value >>> (bits - 8)) & 255);
            bits -= 8;
        }
    }
    return Buffer.from(bytes);
}
function generateTotp(secretBase32, time = Date.now(), timeStepSec = 30) {
    const counter = Math.floor(time / 1000 / timeStepSec);
    const buf = Buffer.alloc(8);
    buf.writeBigInt64BE(BigInt(counter));
    const secretBuffer = base32Decode(secretBase32);
    const hmac = (0, node_crypto_1.createHmac)('sha1', secretBuffer).update(buf).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const code = ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff);
    const otp = (code % 1_000_000).toString().padStart(6, '0');
    return otp;
}
function verifyTotp(token, secretBase32, window = 1, timeStepSec = 30) {
    if (!token || token.length !== 6 || !/^\d{6}$/.test(token)) {
        return false;
    }
    const now = Date.now();
    for (let errorStep = -window; errorStep <= window; errorStep++) {
        const checkTime = now + errorStep * timeStepSec * 1000;
        const expected = generateTotp(secretBase32, checkTime, timeStepSec);
        if ((0, node_crypto_1.timingSafeEqual)(Buffer.from(token), Buffer.from(expected))) {
            return true;
        }
    }
    return false;
}
function generateRecoveryCodes(count = 10) {
    const codes = [];
    for (let i = 0; i < count; i++) {
        const raw = (0, node_crypto_1.randomBytes)(5).toString('hex').slice(0, 8).toUpperCase();
        codes.push(`${raw.slice(0, 4)}-${raw.slice(4)}`);
    }
    return codes;
}
function generateOtpAuthUri(accountName, issuer, secretBase32) {
    const encodedIssuer = encodeURIComponent(issuer);
    const encodedAccount = encodeURIComponent(accountName);
    return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secretBase32}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}
//# sourceMappingURL=totp.js.map