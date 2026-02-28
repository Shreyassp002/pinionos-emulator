import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../../src/app';

let app: ReturnType<typeof createApp>['app'];

const VALID_HASH = '0x' + 'a'.repeat(64);
const INVALID_HASH = '0xshort';

beforeEach(() => {
  ({ app } = createApp());
});

describe('GET /tx/:hash', () => {
  it('returns tx details for valid hash', async () => {
    const res = await request(app).get(`/tx/${VALID_HASH}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.mock, true);
    assert.ok(res.body.data.hash);
    assert.ok(res.body.data.from);
    assert.ok(res.body.data.to);
  });

  it('same hash returns deterministic result', async () => {
    const res1 = await request(app).get(`/tx/${VALID_HASH}`);
    const res2 = await request(app).get(`/tx/${VALID_HASH}`);
    assert.equal(res1.body.data.from, res2.body.data.from);
    assert.equal(res1.body.data.to, res2.body.data.to);
  });

  it('returns 400 for invalid hash', async () => {
    const res = await request(app).get(`/tx/${INVALID_HASH}`);
    assert.equal(res.status, 400);
    assert.match(res.body.error, /invalid/i);
  });
});
