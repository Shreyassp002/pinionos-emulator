import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../../src/app';

let app: ReturnType<typeof createApp>['app'];

beforeEach(() => {
  ({ app } = createApp());
});

// A valid Ethereum private key (test only — never use in production)
const TEST_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

describe('POST /broadcast', () => {
  it('returns a mock tx hash', async () => {
    const res = await request(app).post('/broadcast').send({
      signedTx: '0xdeadbeef',
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.mock, true);
    assert.ok(res.body.data.txHash);
  });

  it('derives from address when privateKey is provided', async () => {
    const res = await request(app).post('/broadcast').send({
      signedTx: '0xdeadbeef',
      privateKey: TEST_PRIVATE_KEY,
    });
    assert.equal(res.status, 200);
    assert.match(res.body.data.from, /^0x[0-9a-fA-F]{40}$/);
  });

  it('returns 400 for invalid privateKey', async () => {
    const res = await request(app).post('/broadcast').send({
      signedTx: '0xdeadbeef',
      privateKey: 'not-a-key',
    });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /invalid/i);
  });
});
