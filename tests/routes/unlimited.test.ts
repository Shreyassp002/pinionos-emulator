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

describe('POST /unlimited', () => {
  it('issues an API key', async () => {
    const res = await request(app).post('/unlimited').send({});
    assert.equal(res.status, 200);
    assert.equal(res.body.mock, true);
    assert.ok(res.body.data.key || res.body.data.apiKey);
  });
});

describe('GET /unlimited/verify', () => {
  it('returns valid=true for issued key', async () => {
    const issue = await request(app).post('/unlimited').send({});
    const key = issue.body.data.key ?? issue.body.data.apiKey;

    const res = await request(app).get(`/unlimited/verify?key=${key}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.valid, true);
  });

  it('returns valid=false for unknown key', async () => {
    const res = await request(app).get('/unlimited/verify?key=nonexistent');
    assert.equal(res.status, 200);
    assert.equal(res.body.valid, false);
  });
});
