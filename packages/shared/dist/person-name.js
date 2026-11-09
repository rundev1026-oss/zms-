"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PERSON_TITLE_OPTIONS = void 0;
exports.normalizePersonPrefix = normalizePersonPrefix;
exports.splitPersonName = splitPersonName;
exports.formatPersonName = formatPersonName;
exports.PERSON_TITLE_OPTIONS = [
    'นาย',
    'นาง',
    'นางสาว',
    'อิหม่าม',
    'ฮัจญี',
    'ฮัจญะห์',
    'อื่นๆ',
];
const KNOWN_TITLE_PREFIXES = [
    'นางสาว',
    'เด็กชาย',
    'เด็กหญิง',
    'ฮัจญะห์',
    'อิหม่าม',
    'ฮัจญี',
    'ด.ช.',
    'ด.ญ.',
    'น.ส.',
    'นาย',
    'นาง',
];
function normalizePersonPrefix(value) {
    const prefix = String(value ?? '').trim();
    if (!prefix || prefix === 'ไม่ระบุ' || prefix === '-')
        return '';
    return prefix;
}
function stripPrefixToken(prefix, value) {
    let text = String(value ?? '').trim();
    if (!prefix || !text)
        return text;
    while (text) {
        if (text === prefix)
            return '';
        if (prefix === 'นาง' && text.startsWith('นางสาว'))
            break;
        if (text.startsWith(`${prefix} `)) {
            text = text.slice(prefix.length).trim();
            continue;
        }
        if (text.startsWith(prefix)) {
            const rest = text.slice(prefix.length).trim();
            if (prefix === 'นาง' && rest.startsWith('สาว'))
                break;
            text = rest;
            continue;
        }
        break;
    }
    return text;
}
function splitPersonName(input) {
    let prefix = normalizePersonPrefix(input.prefix ?? input.titlePrefix ?? input.title);
    let firstName = String(input.firstName ?? '').trim();
    let lastName = String(input.lastName ?? '').trim();
    // If no prefix is provided, attempt to detect from known prefixes in firstName or fullName
    if (!prefix) {
        const textToCheck = firstName || String(input.fullName ?? '').trim();
        for (const known of KNOWN_TITLE_PREFIXES) {
            if (textToCheck.startsWith(`${known} `) || (textToCheck.startsWith(known) && textToCheck.length > known.length)) {
                if (known === 'นาง' && textToCheck.startsWith('นางสาว'))
                    continue;
                prefix = known;
                break;
            }
        }
    }
    if (!firstName && !lastName) {
        let combined = String(input.fullName ?? '').trim();
        if (prefix) {
            combined = stripPrefixToken(prefix, combined);
        }
        const parts = combined.split(/\s+/).filter(Boolean);
        firstName = parts[0] || '';
        lastName = parts.slice(1).join(' ');
    }
    else {
        if (prefix) {
            firstName = stripPrefixToken(prefix, firstName);
        }
        if (!firstName && lastName.includes(' ')) {
            const parts = lastName.split(/\s+/).filter(Boolean);
            firstName = parts[0] || '';
            lastName = parts.slice(1).join(' ');
        }
    }
    return { prefix, firstName, lastName };
}
function formatPersonName(input) {
    const name = splitPersonName(input);
    const given = [name.firstName, name.lastName].filter(Boolean).join(' ');
    if (given)
        return name.prefix ? `${name.prefix} ${given}` : given;
    const fullName = String(input.fullName ?? '').trim();
    if (!fullName)
        return name.prefix;
    if (name.prefix) {
        if (fullName === name.prefix)
            return fullName;
        if (fullName.startsWith(`${name.prefix} `))
            return fullName;
        if (fullName.startsWith(name.prefix)) {
            const rest = fullName.slice(name.prefix.length).trim();
            return rest ? `${name.prefix} ${rest}` : fullName;
        }
    }
    return name.prefix ? `${name.prefix} ${fullName}` : fullName;
}
