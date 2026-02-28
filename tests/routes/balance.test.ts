import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../../src/app';
import { resetBalances } from '../../src/state/balances';

let app: ReturnType<typeof createApp>['app'];

const VALID_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
const INVALID_ADDRESS = '0xinvalid';
const SHORT_ADDRESS = '0xabc';

beforeEach(() => {
  resetBalances();
  ({ app } = createApp());
});

describe('GET /balance/:address', () => {
  it('returns balances for valid address', async () => {
    const res = await request(app).get(`/balance/${VALID_ADDRESS}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.mock, true);
    assert.ok(res.body.data);
    assert.ok(res.body.data.balances);
  });

  it('returns 400 for invalid address', async () => {
    const res = await request(app).get(`/balance/${INVALID_ADDRESS}`);
    assert.equal(res.status, 400);
    assert.match(res.body.error, /invalid/i);
  });

  it('returns 400 for short address', async () => {
    const res = await request(app).get(`/balance/${SHORT_ADDRESS}`);
    assert.equal(res.status, 400);
  });
});
