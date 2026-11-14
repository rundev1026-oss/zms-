import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  API_SERVICE_NAME,
  APP_NAME,
  APP_VERSION,
  PERMISSION_CODES,
  REGISTRY_STATUSES,
  REGISTRY_STATUS_LABELS_TH,
  formatPersonName,
  normalizeRegistryStatusCode,
  splitPersonName,
} from '../dist/index.js';

describe('shared constants', () => {
  it('exposes the foundation app identity', () => {
    assert.equal(APP_NAME, 'ระบบจัดการซะกาต (ZMS)');
    assert.equal(APP_VERSION, '0.1.0');
    assert.equal(API_SERVICE_NAME, 'zms-api');
    assert.ok(PERMISSION_CODES.length >= 14);
    assert.deepEqual(REGISTRY_STATUSES, ['DRAFT', 'UNDER_REVIEW', 'QUALIFIED', 'NOT_QUALIFIED']);
    assert.equal(REGISTRY_STATUS_LABELS_TH.DRAFT, 'ร่าง');
    assert.equal(REGISTRY_STATUS_LABELS_TH.UNDER_REVIEW, 'ตรวจสอบข้อมูล');
    assert.equal(REGISTRY_STATUS_LABELS_TH.QUALIFIED, 'มีคุณสมบัติตามเกณฑ์');
    assert.equal(REGISTRY_STATUS_LABELS_TH.NOT_QUALIFIED, 'ไม่มีคุณสมบัติตามเกณฑ์');
    assert.equal(normalizeRegistryStatusCode('NEEDS_CORRECTION'), 'DRAFT');
    assert.equal(normalizeRegistryStatusCode('need_more_info'), 'DRAFT');
    assert.equal(normalizeRegistryStatusCode('PENDING_REVIEW'), 'UNDER_REVIEW');
    assert.equal(normalizeRegistryStatusCode('pending_verification'), 'UNDER_REVIEW');
    assert.equal(normalizeRegistryStatusCode('ELIGIBLE'), 'QUALIFIED');
    assert.equal(normalizeRegistryStatusCode('INELIGIBLE'), 'NOT_QUALIFIED');
  });

  it('formats a person name with the prefix once', () => {
    assert.equal(
      formatPersonName({ prefix: 'นางสาว', firstName: 'มารีแย', lastName: 'ลาเต๊ะ' }),
      'นางสาว มารีแย ลาเต๊ะ',
    );
    assert.equal(
      formatPersonName({ prefix: 'นาย', firstName: 'อิบรอฮีม', lastName: 'มานะชัย' }),
      'นาย อิบรอฮีม มานะชัย',
    );
    assert.equal(
      formatPersonName({ prefix: 'นาง', firstName: 'ฟาตีเมาะ', lastName: 'สาและ' }),
      'นาง ฟาตีเมาะ สาและ',
    );
    assert.equal(
      formatPersonName({ prefix: 'ไม่ระบุ', firstName: 'อับดุลเลาะ', lastName: 'เจ๊ะมะ' }),
      'อับดุลเลาะ เจ๊ะมะ',
    );
    assert.equal(
      formatPersonName({
        prefix: 'นางสาว',
        firstName: 'นางสาว มารีแย',
        lastName: 'ลาเต๊ะ',
        fullName: 'นางสาว นางสาว มารีแย ลาเต๊ะ',
      }),
      'นางสาว มารีแย ลาเต๊ะ',
    );
    assert.equal(
      formatPersonName({
        prefix: 'นาย',
        firstName: 'นายมุกลิส',
        lastName: 'มีระยะ',
      }),
      'นาย มุกลิส มีระยะ',
    );
    assert.equal(
      formatPersonName({
        prefix: 'นางสาว',
        fullName: 'นางสาวสมศรี ใจดี',
      }),
      'นางสาว สมศรี ใจดี',
    );
    assert.equal(
      formatPersonName({
        fullName: 'นายสมชาย สบายดี',
      }),
      'นาย สมชาย สบายดี',
    );
    assert.deepEqual(
      splitPersonName({ prefix: 'นางสาว', fullName: 'นางสาว มารีแย ลาเต๊ะ' }),
      { prefix: 'นางสาว', firstName: 'มารีแย', lastName: 'ลาเต๊ะ' },
    );
    assert.deepEqual(
      splitPersonName({ prefix: 'นาย', firstName: 'นายมุกลิส', lastName: 'มีระยะ' }),
      { prefix: 'นาย', firstName: 'มุกลิส', lastName: 'มีระยะ' },
    );
  });
});
