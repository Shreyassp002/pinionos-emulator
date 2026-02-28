import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../../src/app';

let app: ReturnType<typeof createApp>['app'];

beforeEach(() => {
  ({ app } = createApp());
});

describe('GET /wallet/generate', () => {
  it('returns a wallet with address and private key', async () => {
    const res = await request(app).get('/wallet/generate');
    assert.equal(res.status, 200);
    assert.equal(res.body.mock, true);
    assert.ok(res.body.data.address);
    assert.ok(res.body.data.privateKey);
    assert.match(res.body.data.address, /^0x[0-9a-fA-F]{40}$/);
  });

  it('generates different wallets each time', async () => {
    const res1 = await request(app).get('/wallet/generate');
    const res2 = await request(app).get('/wallet/generate');
    assert.notEqual(res1.body.data.address, res2.body.data.address);
  });
});
