import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../../src/app';
import { resetBalances } from '../../src/state/balances';

let app: ReturnType<typeof createApp>['app'];

beforeEach(() => {
  resetBalances();
  ({ app } = createApp());
});

describe('POST /trade', () => {
  it('executes a mock swap', async () => {
    const res = await request(app)
      .post('/trade')
      .send({ src: 'ETH', dst: 'USDC', amount: '0.1', slippage: 1 });
    assert.equal(res.status, 200);
    assert.equal(res.body.mock, true);
    assert.equal(res.body.data.srcToken, 'ETH');
    assert.equal(res.body.data.dstToken, 'USDC');
    assert.ok(res.body.data.toAmount);
    assert.ok(res.body.data.swap);
  });

  it('mutates balances (deducts src, credits dst)', async () => {
    const ADDR = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
    await request(app)
      .post('/trade')
      .send({ src: 'ETH', dst: 'USDC', amount: '0.1', slippage: 1, from: ADDR });

    const bal = await request(app).get(`/balance/${ADDR}`);
    const ethAfter = parseFloat(bal.body.data.balances.ETH);
    // Started with 3.2 ETH, traded 0.1
    assert.ok(ethAfter < 3.2, `ETH should decrease: got ${ethAfter}`);
    // USDC should increase from 500
    const usdcAfter = parseFloat(bal.body.data.balances.USDC);
    assert.ok(usdcAfter > 500, `USDC should increase: got ${usdcAfter}`);
  });

  it('returns 400 for same-token swap', async () => {
    const res = await request(app)
      .post('/trade')
      .send({ src: 'ETH', dst: 'ETH', amount: '1', slippage: 1 });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /different/i);
  });

  it('returns 400 for missing fields', async () => {
    const res = await request(app).post('/trade').send({});
    assert.equal(res.status, 400);
  });

  it('returns 400 for negative amount', async () => {
    const res = await request(app)
      .post('/trade')
      .send({ src: 'ETH', dst: 'USDC', amount: '-1', slippage: 1 });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /positive/i);
  });

  it('returns 400 for invalid slippage', async () => {
    const res = await request(app)
      .post('/trade')
      .send({ src: 'ETH', dst: 'USDC', amount: '0.1', slippage: 99 });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /slippage/i);
  });

  it('returns 400 for insufficient balance', async () => {
    const res = await request(app)
      .post('/trade')
      .send({ src: 'ETH', dst: 'USDC', amount: '99999', slippage: 1 });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /insufficient/i);
  });

  it('includes from in response when provided', async () => {
    const res = await request(app)
      .post('/trade')
      .send({ src: 'ETH', dst: 'USDC', amount: '0.1', slippage: 1, from: '0xabc' });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.from, '0xabc');
  });
});
