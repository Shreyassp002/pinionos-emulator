import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../../src/app';
import { setCliOverrides } from '../../src/config';
import { resetBalances } from '../../src/state/balances';

let app: ReturnType<typeof createApp>['app'];

function makePaymentHeader(): string {
  const payload = {
    x402Version: 1,
    scheme: 'exact',
    network: 'base',
    payload: {
      signature: '0x' + 'ab'.repeat(65),
      authorization: {
        from: '0x' + 'de'.repeat(20),
        to: '0x' + 'be'.repeat(20),
        value: '10000',
      },
    },
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

beforeEach(() => {
  setCliOverrides({ x402Mode: true });
  resetBalances();
  ({ app } = createApp());
});

describe('x402 payment flow', () => {
  it('returns 402 for request without payment or API key', async () => {
    const res = await request(app).get('/balance/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');
    assert.equal(res.status, 402);
    assert.equal(res.body.x402Version, 1);
    assert.ok(Array.isArray(res.body.accepts));
    assert.equal(res.body.accepts[0].scheme, 'exact');
    assert.equal(res.body.accepts[0].network, 'base');
    assert.ok(res.body.accepts[0].asset);
  });

  it('passes through with valid X-PAYMENT header', async () => {
    const res = await request(app)
      .get('/balance/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045')
      .set('X-PAYMENT', makePaymentHeader());
    assert.equal(res.status, 200);
    assert.equal(res.body.mock, true);
  });

  it('passes through with X-API-KEY header', async () => {
    // First issue a key
    const issue = await request(app)
      .post('/unlimited')
      .set('X-PAYMENT', makePaymentHeader());
    const key = issue.body.data?.key ?? issue.body.data?.apiKey ?? 'test-key';

    const res = await request(app)
      .get('/balance/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045')
      .set('X-API-KEY', key);
    assert.equal(res.status, 200);
  });

  it('returns 401 for unknown X-API-KEY header', async () => {
    const res = await request(app)
      .get('/balance/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045')
      .set('X-API-KEY', 'pk_mock_unknown_key');
    assert.equal(res.status, 401);
    assert.match(res.body.error, /invalid api key/i);
  });

  it('returns 400 for invalid X-PAYMENT header', async () => {
    const res = await request(app)
      .get('/balance/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045')
      .set('X-PAYMENT', 'not-valid-base64-json');
    assert.equal(res.status, 400);
    assert.match(res.body.error, /invalid/i);
  });

  it('skips x402 for health endpoint', async () => {
    const res = await request(app).get('/health');
    assert.equal(res.status, 200);
  });

  it('skips x402 for /unlimited/verify', async () => {
    const res = await request(app).get('/unlimited/verify?key=test');
    assert.equal(res.status, 200);
  });
});
