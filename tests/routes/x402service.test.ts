import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../../src/app';
import { resetBalances } from '../../src/state/balances';

let app: ReturnType<typeof createApp>['app'];

beforeEach(() => {
  resetBalances();
  ({ app } = createApp());
});

describe('/x402/* service', () => {
  it('returns 402 without payment or api key', async () => {
    const res = await request(app).get('/x402/demo');
    assert.equal(res.status, 402);
    assert.equal(res.body.x402Version, 1);
  });

  it('allows issued API key bypass', async () => {
    const issue = await request(app).post('/unlimited').send({});
    const key = issue.body.data?.key ?? issue.body.data?.apiKey;
    assert.ok(key);

    const res = await request(app).get('/x402/demo').set('X-API-KEY', key);
    assert.equal(res.status, 200);
    assert.equal(res.body.paidAmount, '0');
  });

  it('rejects unknown API key', async () => {
    const res = await request(app).get('/x402/demo').set('X-API-KEY', 'pk_mock_unknown_key');
    assert.equal(res.status, 401);
    assert.match(res.body.error, /invalid api key/i);
  });
});
