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

describe('GET /', () => {
  it('returns emulator status', async () => {
    const res = await request(app).get('/');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.emulator, true);
  });
});

describe('GET /health', () => {
  it('returns health with port', async () => {
    const res = await request(app).get('/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(typeof res.body.port, 'number');
  });
});

describe('GET /nonexistent', () => {
  it('returns 404', async () => {
    const res = await request(app).get('/nonexistent');
    assert.equal(res.status, 404);
    assert.equal(res.body.error, 'route not found');
  });
});
