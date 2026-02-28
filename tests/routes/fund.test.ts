import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../../src/app';
import { resetBalances } from '../../src/state/balances';

let app: ReturnType<typeof createApp>['app'];

const VALID_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

beforeEach(() => {
  resetBalances();
  ({ app } = createApp());
});

describe('GET /fund/:address', () => {
  it('credits faucet amounts', async () => {
    const before = await request(app).get(`/balance/${VALID_ADDRESS}`);
    const ethBefore = parseFloat(before.body.data.balances.ETH);

    await request(app).get(`/fund/${VALID_ADDRESS}`);

    const after = await request(app).get(`/balance/${VALID_ADDRESS}`);
    const ethAfter = parseFloat(after.body.data.balances.ETH);
    assert.ok(ethAfter > ethBefore, `ETH should increase from ${ethBefore} to ${ethAfter}`);
  });

  it('returns balances and funding info', async () => {
    const res = await request(app).get(`/fund/${VALID_ADDRESS}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.mock, true);
    assert.ok(res.body.data.balances);
    assert.ok(res.body.data.depositAddress);
    assert.equal(res.body.data.network, 'base');
  });

  it('returns 400 for invalid address', async () => {
    const res = await request(app).get('/fund/0xinvalid');
    assert.equal(res.status, 400);
    assert.match(res.body.error, /invalid/i);
  });
});
