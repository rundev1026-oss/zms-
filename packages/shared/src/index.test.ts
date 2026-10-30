import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { API_SERVICE_NAME, APP_NAME, APP_VERSION, PERMISSION_CODES } from '../dist/index.js';

describe('shared constants', () => {
  it('exposes the foundation app identity', () => {
    assert.equal(APP_NAME, 'ระบบจัดการซะกาต (ZMS)');
    assert.equal(APP_VERSION, '0.1.0');
    assert.equal(API_SERVICE_NAME, 'zms-api');
    assert.ok(PERMISSION_CODES.length >= 14);
  });
});
