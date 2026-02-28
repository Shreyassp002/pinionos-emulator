import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../../src/app';

let app: ReturnType<typeof createApp>['app'];

beforeEach(() => {
  ({ app } = createApp());
});

describe('POST /chat', () => {
  it('returns a reply for a message', async () => {
    const res = await request(app).post('/chat').send({ message: 'hello' });
    assert.equal(res.status, 200);
    assert.equal(res.body.mock, true);
    assert.ok(res.body.data.reply);
    assert.ok(res.body.data.model);
  });

  it('returns contextual response for price query', async () => {
    const res = await request(app).post('/chat').send({ message: 'what is the price of ETH?' });
    assert.equal(res.status, 200);
    assert.match(res.body.data.reply, /ETH/i);
  });

  it('returns contextual response for send query', async () => {
    const res = await request(app).post('/chat').send({ message: 'how do I send USDC?' });
    assert.equal(res.status, 200);
    assert.match(res.body.data.reply, /send/i);
  });

  it('returns contextual response for help', async () => {
    const res = await request(app).post('/chat').send({ message: 'help me' });
    assert.equal(res.status, 200);
    assert.match(res.body.data.reply, /help/i);
  });

  it('accepts messages array (history format)', async () => {
    const res = await request(app).post('/chat').send({
      messages: [{ role: 'user', content: 'what can you do?' }],
    });
    assert.equal(res.status, 200);
    assert.ok(res.body.data.reply);
  });

  it('returns 400 for empty message', async () => {
    const res = await request(app).post('/chat').send({ message: '' });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /required/i);
  });
});
