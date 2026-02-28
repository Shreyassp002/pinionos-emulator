import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../../src/app';
import { credit, getBalance, resetBalances } from '../../src/state/balances';

let app: ReturnType<typeof createApp>['app'];

const TO_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

beforeEach(() => {
  resetBalances();
  ({ app } = createApp());
});

describe('POST /send', () => {
  it('builds unsigned ETH transfer', async () => {
    const res = await request(app)
      .post('/send')
      .send({ to: TO_ADDRESS, amount: '0.1', token: 'ETH' });
    assert.equal(res.status, 200);
    assert.equal(res.body.mock, true);
    assert.ok(res.body.data.tx);
    assert.equal(res.body.data.token, 'ETH');
  });

  it('builds unsigned USDC transfer', async () => {
    const res = await request(app)
      .post('/send')
      .send({ to: TO_ADDRESS, amount: '10', token: 'USDC' });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.token, 'USDC');
  });

  it('deducts from balance', async () => {
    const SENDER = TO_ADDRESS; // use the configured address
    // Check initial balance
    const before = await request(app).get(`/balance/${SENDER}`);
    const ethBefore = parseFloat(before.body.data.balances.ETH);

    // Send to a different address
    const RECEIVER = '0x0000000000000000000000000000000000000001';
    await request(app)
      .post('/send')
      .send({ to: RECEIVER, amount: '0.1', token: 'ETH', from: SENDER });

    const after = await request(app).get(`/balance/${SENDER}`);
    const ethAfter = parseFloat(after.body.data.balances.ETH);
    assert.ok(ethAfter < ethBefore, `balance should decrease: ${ethBefore} -> ${ethAfter}`);
  });

  it('returns 400 for insufficient balance', async () => {
    const res = await request(app)
      .post('/send')
      .send({ to: TO_ADDRESS, amount: '99999', token: 'ETH' });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /insufficient/i);
  });

  it('returns 400 for missing fields', async () => {
    const res = await request(app).post('/send').send({});
    assert.equal(res.status, 400);
  });

  it('returns 400 for invalid address', async () => {
    const res = await request(app)
      .post('/send')
      .send({ to: 'not-an-address', amount: '0.1', token: 'ETH' });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /invalid/i);
  });

  it('returns 400 for negative amount', async () => {
    const res = await request(app)
      .post('/send')
      .send({ to: TO_ADDRESS, amount: '-1', token: 'ETH' });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /positive/i);
  });

  it('returns 400 for unsupported token', async () => {
    credit('default', 'DOGECOIN', 100);
    const before = getBalance('default', 'DOGECOIN');

    const res = await request(app)
      .post('/send')
      .send({ to: TO_ADDRESS, amount: '1', token: 'DOGECOIN' });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /unsupported/i);

    const after = getBalance('default', 'DOGECOIN');
    assert.equal(after, before, 'unsupported token request must not mutate balances');
  });
});
