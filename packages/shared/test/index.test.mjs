import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  API_SERVICE_NAME,
  APP_NAME,
  APP_VERSION,
  PERMISSION_CODES,
  formatPersonName,
  splitPersonName,
} from '../dist/index.js';

describe('shared constants', () => {
  it('exposes the foundation app identity', () => {
    assert.equal(APP_NAME, 'ระบบจัดการซะกาต (ZMS)');
    assert.equal(APP_VERSION, '0.1.0');
    assert.equal(API_SERVICE_NAME, 'zms-api');
    assert.ok(PERMISSION_CODES.length >= 14);
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
    assert.deepEqual(
      splitPersonName({ prefix: 'นางสาว', fullName: 'นางสาว มารีแย ลาเต๊ะ' }),
      { prefix: 'นางสาว', firstName: 'มารีแย', lastName: 'ลาเต๊ะ' },
    );
  });
});
