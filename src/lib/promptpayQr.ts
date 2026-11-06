/**
 * PromptPay EMVCo Merchant-Presented Mode (MPM) QR Code Generator & Validator
 * มาตรฐาน Thai QR Payment ธนาคารแห่งประเทศไทย (BOT) และ EMVCo Specification
 * 
 * รองรับ:
 * 1. Static QR (รับเงินทั่วไป ไม่ระบุยอด หรือระบุยอดได้) - Point of Initiation Method = '11'
 * 2. Dynamic QR (รายการเฉพาะ ระบุยอดเงิน, Reference, Expiration) - Point of Initiation Method = '12'
 * 3. Proxy Types:
 *    - หมายเลขโทรศัพท์ 10 หลัก (Tag 29 Sub-tag 01, format: 0066XXXXXXXXX)
 *    - เลขประจำตัวผู้เสียภาษี / บัตร ปชช. 13 หลัก (Tag 29 Sub-tag 02, format: 13 digits)
 *    - e-Wallet ID 15 หลัก (Tag 29 Sub-tag 03)
 *    - Biller ID 15 หลัก (Tag 30)
 * 4. CRC16-CCITT Checksum Calculation (Polynomial 0x1021, Initial 0xFFFF)
 * 5. การสร้างรูปภาพ QR Code แบบ Local (Data URL / SVG) โดยไม่พึ่งพา External API
 * 6. Parser & Validator สำหรับตรวจสอบโครงสร้าง EMVCo, Tags, Amount, Reference และ CRC
 */

import QRCode from 'qrcode';
import { validatePromptPay, PromptPayType } from './promptpayValidator';

// EMVCo MPM Main Tags
export const EMVCO_TAGS = {
  PAYLOAD_FORMAT_INDICATOR: '00',
  POINT_OF_INITIATION_METHOD: '01',
  MERCHANT_ACCOUNT_PROMPTPAY: '29',
  MERCHANT_ACCOUNT_BILL_PAYMENT: '30',
  TRANSACTION_CURRENCY: '53',
  TRANSACTION_AMOUNT: '54',
  COUNTRY_CODE: '58',
  ADDITIONAL_DATA: '62',
  CRC: '63',
} as const;

// PromptPay AIDs (Application Identifier)
export const PROMPTPAY_AID = {
  CREDIT_TRANSFER: 'A000000677010111', // P2P, Tax ID, Phone (Tag 29)
  BILL_PAYMENT: 'A000000677010112',    // Cross-Bank Bill Payment (Tag 30)
} as const;

export interface StaticQrOptions {
  promptpayId: string;
  amount?: number;
  terminalLabel?: string;
}

export interface DynamicQrOptions {
  promptpayId: string;
  amount: number;
  referenceNo: string;
  terminalLabel?: string;
  expiresInMinutes?: number;
  bankAccountId?: string;
  accountName?: string;
}

export interface QrGenerationResult {
  success: boolean;
  qrType: 'static' | 'dynamic';
  payload: string;
  crc: string;
  amount?: number;
  referenceNo?: string;
  promptpayType: PromptPayType;
  promptpayTarget: string;
  formattedTarget: string;
  dataUrl?: string;
  expiresAt?: string;
  error?: string;
}

export interface QrValidationResult {
  valid: boolean;
  qrType?: 'static' | 'dynamic';
  promptpayType?: PromptPayType;
  promptpayTarget?: string;
  amount?: number;
  currency?: string;
  countryCode?: string;
  reference?: string;
  crc?: string;
  computedCrc?: string;
  error?: string;
  tlvMap?: Record<string, string>;
  subTlvMap?: Record<string, string>;
}

/**
 * 1. Tag-Length-Value (TLV) Formatter
 * EMVCo MPM: Tag (2 chars) + Length (2 chars) + Value
 */
export function formatTlv(tag: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${tag}${len}${value}`;
}

/**
 * 2. CRC16-CCITT Calculation
 * Polynomial: 0x1021 (X^16 + X^12 + X^5 + 1)
 * Initial Value: 0xFFFF
 * Input: String data up to and including '6304'
 * Output: 4 uppercase hex characters (e.g. '823E')
 */
export function calcCrc16(data: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= (data.charCodeAt(i) << 8);
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * 3. Format PromptPay Target for Tag 29 / 30 Sub-tags
 */
export function formatMerchantAccountInfo(promptpayId: string): {
  tag: string;
  value: string;
  type: PromptPayType;
  normalizedTarget: string;
  formattedDisplay: string;
} {
  const validation = validatePromptPay(promptpayId);
  if (!validation.valid || !validation.normalized || !validation.type) {
    throw new Error(`หมายเลข PromptPay ไม่ถูกต้อง: ${validation.error}`);
  }

  const clean = validation.normalized;
  const pType = validation.type;

  if (pType === 'phone') {
    // Mobile Phone: Tag 29 Sub-tag 01 (13 digits: 0066 + 9 digits of phone without leading 0)
    const intlPhone = `0066${clean.slice(1)}`;
    const subTag00 = formatTlv('00', PROMPTPAY_AID.CREDIT_TRANSFER);
    const subTag01 = formatTlv('01', intlPhone);
    return {
      tag: EMVCO_TAGS.MERCHANT_ACCOUNT_PROMPTPAY,
      value: subTag00 + subTag01,
      type: 'phone',
      normalizedTarget: clean,
      formattedDisplay: validation.formatted || clean,
    };
  }

  if (pType === 'tax_id' || pType === 'national_id') {
    // Tax ID / National ID: Tag 29 Sub-tag 02 (13 digits)
    const subTag00 = formatTlv('00', PROMPTPAY_AID.CREDIT_TRANSFER);
    const subTag02 = formatTlv('02', clean);
    return {
      tag: EMVCO_TAGS.MERCHANT_ACCOUNT_PROMPTPAY,
      value: subTag00 + subTag02,
      type: pType,
      normalizedTarget: clean,
      formattedDisplay: validation.formatted || clean,
    };
  }

  if (pType === 'biller_id') {
    // Bill Payment: Tag 30 (15 digits)
    const subTag00 = formatTlv('00', PROMPTPAY_AID.BILL_PAYMENT);
    const subTag01 = formatTlv('01', clean);
    return {
      tag: EMVCO_TAGS.MERCHANT_ACCOUNT_BILL_PAYMENT,
      value: subTag00 + subTag01,
      type: 'biller_id',
      normalizedTarget: clean,
      formattedDisplay: validation.formatted || clean,
    };
  }

  throw new Error(`ไม่รองรับประเภท PromptPay: ${pType}`);
}

/**
 * 4. Generate Static PromptPay QR (General collection, reusable)
 * Point of Initiation Method = '11'
 */
export async function generateStaticPromptPayQr(
  options: StaticQrOptions,
  generateImage: boolean = true
): Promise<QrGenerationResult> {
  const merchantInfo = formatMerchantAccountInfo(options.promptpayId);

  // Build Payload
  let payload = '';
  // 00: Payload Format Indicator = '01'
  payload += formatTlv(EMVCO_TAGS.PAYLOAD_FORMAT_INDICATOR, '01');
  // 01: Point of Initiation Method = '11' (Static)
  payload += formatTlv(EMVCO_TAGS.POINT_OF_INITIATION_METHOD, '11');
  // 29 or 30: Merchant Account Information
  payload += formatTlv(merchantInfo.tag, merchantInfo.value);
  // 53: Transaction Currency = '764' (THB)
  payload += formatTlv(EMVCO_TAGS.TRANSACTION_CURRENCY, '764');

  // 54: Transaction Amount (optional in Static QR)
  if (options.amount && options.amount > 0) {
    const amtStr = Number(options.amount).toFixed(2);
    payload += formatTlv(EMVCO_TAGS.TRANSACTION_AMOUNT, amtStr);
  }

  // 58: Country Code = 'TH'
  payload += formatTlv(EMVCO_TAGS.COUNTRY_CODE, 'TH');

  // 62: Additional Data (Optional terminal label / reference)
  if (options.terminalLabel && options.terminalLabel.trim()) {
    const subTag07 = formatTlv('07', options.terminalLabel.trim().slice(0, 25));
    payload += formatTlv(EMVCO_TAGS.ADDITIONAL_DATA, subTag07);
  }

  // 63: CRC calculation
  const payloadToCrc = payload + `${EMVCO_TAGS.CRC}04`;
  const crc = calcCrc16(payloadToCrc);
  const fullPayload = payloadToCrc + crc;

  let dataUrl: string | undefined = undefined;
  if (generateImage) {
    dataUrl = await generateQrDataUrl(fullPayload);
  }

  return {
    success: true,
    qrType: 'static',
    payload: fullPayload,
    crc,
    amount: options.amount,
    promptpayType: merchantInfo.type,
    promptpayTarget: merchantInfo.normalizedTarget,
    formattedTarget: merchantInfo.formattedDisplay,
    dataUrl,
  };
}

/**
 * 5. Generate Dynamic PromptPay QR (Specific transaction, specified amount & reference, expiring)
 * Point of Initiation Method = '12'
 */
export async function generateDynamicPromptPayQr(
  options: DynamicQrOptions,
  generateImage: boolean = true
): Promise<QrGenerationResult> {
  if (!options.amount || options.amount <= 0) {
    throw new Error('จำนวนเงินสำหรับ Dynamic QR ต้องมากกว่า 0 บาท');
  }
  if (!options.referenceNo || !options.referenceNo.trim()) {
    throw new Error('กรุณาระบุหมายเลขอ้างอิง (Reference No.) สำหรับ Dynamic QR');
  }

  const cleanRef = options.referenceNo.trim();
  const merchantInfo = formatMerchantAccountInfo(options.promptpayId);

  // Build Payload
  let payload = '';
  // 00: Payload Format Indicator = '01'
  payload += formatTlv(EMVCO_TAGS.PAYLOAD_FORMAT_INDICATOR, '01');
  // 01: Point of Initiation Method = '12' (Dynamic)
  payload += formatTlv(EMVCO_TAGS.POINT_OF_INITIATION_METHOD, '12');
  // 29 or 30: Merchant Account Information
  payload += formatTlv(merchantInfo.tag, merchantInfo.value);
  // 53: Transaction Currency = '764' (THB)
  payload += formatTlv(EMVCO_TAGS.TRANSACTION_CURRENCY, '764');
  // 54: Transaction Amount (Mandatory for Dynamic QR)
  const amtStr = Number(options.amount).toFixed(2);
  payload += formatTlv(EMVCO_TAGS.TRANSACTION_AMOUNT, amtStr);
  // 58: Country Code = 'TH'
  payload += formatTlv(EMVCO_TAGS.COUNTRY_CODE, 'TH');

  // 62: Additional Data Field (Reference / Bill Number)
  // Sub-tag 07: Terminal Label / Purpose Reference (up to 25 chars)
  const subTag07 = formatTlv('07', cleanRef.slice(0, 25));
  payload += formatTlv(EMVCO_TAGS.ADDITIONAL_DATA, subTag07);

  // 63: CRC calculation
  const payloadToCrc = payload + `${EMVCO_TAGS.CRC}04`;
  const crc = calcCrc16(payloadToCrc);
  const fullPayload = payloadToCrc + crc;

  const expiryMinutes = options.expiresInMinutes || 15;
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();

  let dataUrl: string | undefined = undefined;
  if (generateImage) {
    dataUrl = await generateQrDataUrl(fullPayload);
  }

  return {
    success: true,
    qrType: 'dynamic',
    payload: fullPayload,
    crc,
    amount: Number(amtStr),
    referenceNo: cleanRef,
    promptpayType: merchantInfo.type,
    promptpayTarget: merchantInfo.normalizedTarget,
    formattedTarget: merchantInfo.formattedDisplay,
    expiresAt,
    dataUrl,
  };
}

/**
 * 6. Generate QR Code Image locally (Data URL - PNG)
 * Uses local in-memory qrcode library without external network calls
 */
export async function generateQrDataUrl(payload: string): Promise<string> {
  return await QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    margin: 2,
    scale: 8,
    color: {
      dark: '#0f172a', // Slate 900
      light: '#ffffff',
    },
  });
}

/**
 * 7. Generate QR Code SVG string locally
 */
export async function generateQrSvg(payload: string): Promise<string> {
  return await QRCode.toString(payload, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 2,
  });
}

/**
 * 8. Parse and Validate PromptPay EMVCo QR Payload
 * Extracts TLV tags, verifies CRC16, and validates amounts and identifiers
 */
export function parseAndValidatePromptPayQr(rawPayload: string): QrValidationResult {
  if (!rawPayload || typeof rawPayload !== 'string') {
    return { valid: false, error: 'ข้อมูล QR Code ว่างเปล่าหรือไม่ถูกต้อง' };
  }

  const cleanPayload = rawPayload.trim();

  // 1. Verify Minimum Length & CRC Tag presence
  if (cleanPayload.length < 20) {
    return { valid: false, error: 'ความยาวของข้อมูล QR Code สั้นเกินกว่ามาตรฐาน EMVCo' };
  }

  const crcTagIndex = cleanPayload.lastIndexOf('6304');
  if (crcTagIndex === -1 || crcTagIndex !== cleanPayload.length - 8) {
    return { valid: false, error: 'ไม่พบ Tag 63 (CRC) ที่ถูกต้อง ณ ท้าย Payload' };
  }

  // 2. Verify CRC16-CCITT Checksum
  const dataBeforeCrc = cleanPayload.slice(0, crcTagIndex + 4);
  const statedCrc = cleanPayload.slice(crcTagIndex + 4).toUpperCase();
  const computedCrc = calcCrc16(dataBeforeCrc);

  if (statedCrc !== computedCrc) {
    return {
      valid: false,
      crc: statedCrc,
      computedCrc,
      error: `CRC16 ไม่ถูกต้อง (ระบุ: ${statedCrc}, คำนวณได้: ${computedCrc}) ข้อมูลอาจถูกปลอมแปลงหรือเสียหาย`,
    };
  }

  // 3. Parse Top-Level TLVs
  const tlvMap: Record<string, string> = {};
  let idx = 0;

  try {
    while (idx < cleanPayload.length) {
      const tag = cleanPayload.slice(idx, idx + 2);
      const lenStr = cleanPayload.slice(idx + 2, idx + 4);
      const len = parseInt(lenStr, 10);
      if (isNaN(len) || len < 0) {
        return { valid: false, error: `พบ Length ไม่ถูกต้อง ณ ตำแหน่ง ${idx} (Tag: ${tag})` };
      }
      const val = cleanPayload.slice(idx + 4, idx + 4 + len);
      tlvMap[tag] = val;
      idx += 4 + len;
    }
  } catch (err: any) {
    return { valid: false, error: `เกิดข้อผิดพลาดในการแยกวิเคราะห์ TLV: ${err.message}` };
  }

  // 4. Validate Format Indicator (Tag 00)
  if (tlvMap[EMVCO_TAGS.PAYLOAD_FORMAT_INDICATOR] !== '01') {
    return { valid: false, error: 'Tag 00 (Payload Format Indicator) ต้องเป็น 01' };
  }

  // 5. Point of Initiation Method (Tag 01)
  const initMethod = tlvMap[EMVCO_TAGS.POINT_OF_INITIATION_METHOD];
  const qrType: 'static' | 'dynamic' = initMethod === '12' ? 'dynamic' : 'static';

  // 6. Currency (Tag 53) & Country Code (Tag 58)
  const currency = tlvMap[EMVCO_TAGS.TRANSACTION_CURRENCY];
  if (currency !== '764') {
    return { valid: false, error: `สกุลเงินต้องเป็น 764 (THB) แต่พบ: ${currency}` };
  }
  const countryCode = tlvMap[EMVCO_TAGS.COUNTRY_CODE];
  if (countryCode !== 'TH') {
    return { valid: false, error: `รหัสประเทศต้องเป็น TH แต่พบ: ${countryCode}` };
  }

  // 7. Amount (Tag 54)
  let parsedAmount: number | undefined = undefined;
  if (tlvMap[EMVCO_TAGS.TRANSACTION_AMOUNT]) {
    parsedAmount = parseFloat(tlvMap[EMVCO_TAGS.TRANSACTION_AMOUNT]);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return { valid: false, error: 'Tag 54 (จำนวนเงิน) ต้องเป็นตัวเลขมากกว่า 0' };
    }
  }

  if (qrType === 'dynamic' && parsedAmount === undefined) {
    return { valid: false, error: 'Dynamic QR (Tag 01=12) จำเป็นต้องระบุจำนวนเงิน (Tag 54)' };
  }

  // 8. Merchant Account Info (Tag 29 or Tag 30)
  let promptpayType: PromptPayType = 'phone';
  let promptpayTarget = '';
  const subTlvMap: Record<string, string> = {};

  if (tlvMap[EMVCO_TAGS.MERCHANT_ACCOUNT_PROMPTPAY]) {
    const rawMerchant = tlvMap[EMVCO_TAGS.MERCHANT_ACCOUNT_PROMPTPAY];
    let mIdx = 0;
    while (mIdx < rawMerchant.length) {
      const subTag = rawMerchant.slice(mIdx, mIdx + 2);
      const subLen = parseInt(rawMerchant.slice(mIdx + 2, mIdx + 4), 10);
      const subVal = rawMerchant.slice(mIdx + 4, mIdx + 4 + subLen);
      subTlvMap[subTag] = subVal;
      mIdx += 4 + subLen;
    }

    if (subTlvMap['00'] !== PROMPTPAY_AID.CREDIT_TRANSFER) {
      return { valid: false, error: `AID ของ Tag 29 ไม่ถูกต้อง (พบ: ${subTlvMap['00']})` };
    }

    if (subTlvMap['01']) {
      promptpayType = 'phone';
      // Convert 0066XXXXXXXXX to 0XXXXXXXXX
      const p = subTlvMap['01'];
      promptpayTarget = p.startsWith('0066') ? `0${p.slice(4)}` : p;
    } else if (subTlvMap['02']) {
      promptpayType = subTlvMap['02'].startsWith('0') ? 'tax_id' : 'national_id';
      promptpayTarget = subTlvMap['02'];
    } else if (subTlvMap['03']) {
      promptpayType = 'biller_id';
      promptpayTarget = subTlvMap['03'];
    }
  } else if (tlvMap[EMVCO_TAGS.MERCHANT_ACCOUNT_BILL_PAYMENT]) {
    const rawBiller = tlvMap[EMVCO_TAGS.MERCHANT_ACCOUNT_BILL_PAYMENT];
    let bIdx = 0;
    while (bIdx < rawBiller.length) {
      const subTag = rawBiller.slice(bIdx, bIdx + 2);
      const subLen = parseInt(rawBiller.slice(bIdx + 2, bIdx + 4), 10);
      const subVal = rawBiller.slice(bIdx + 4, bIdx + 4 + subLen);
      subTlvMap[subTag] = subVal;
      bIdx += 4 + subLen;
    }
    promptpayType = 'biller_id';
    promptpayTarget = subTlvMap['01'] || '';
  } else {
    return { valid: false, error: 'ไม่พบ Tag 29 หรือ Tag 30 (Merchant Account Information) ใน Payload' };
  }

  // 9. Additional Data (Tag 62)
  let reference: string | undefined = undefined;
  if (tlvMap[EMVCO_TAGS.ADDITIONAL_DATA]) {
    const rawAdd = tlvMap[EMVCO_TAGS.ADDITIONAL_DATA];
    let aIdx = 0;
    while (aIdx < rawAdd.length) {
      const aTag = rawAdd.slice(aIdx, aIdx + 2);
      const aLen = parseInt(rawAdd.slice(aIdx + 2, aIdx + 4), 10);
      const aVal = rawAdd.slice(aIdx + 4, aIdx + 4 + aLen);
      if (aTag === '07' || aTag === '05' || aTag === '01') {
        reference = aVal;
      }
      aIdx += 4 + aLen;
    }
  }

  return {
    valid: true,
    qrType,
    promptpayType,
    promptpayTarget,
    amount: parsedAmount,
    currency,
    countryCode,
    reference,
    crc: statedCrc,
    computedCrc,
    tlvMap,
    subTlvMap,
  };
}

