import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../../src/app';
import { resetBalances } from '../../src/state/balances';

let app: ReturnType<typeof createApp>['app'];

const ADDR = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

beforeEach(() => {
  resetBalances();
  ({ app } = createApp());
});

describe('POST /reset', () => {
  it('restores balances after mutation', async () => {
    const RECEIVER = '0x0000000000000000000000000000000000000001';
    // Mutate: send some ETH from the configured address
    await request(app)
      .post('/send')
      .send({ to: RECEIVER, amount: '0.5', token: 'ETH', from: ADDR });

    const before = await request(app).get(`/balance/${ADDR}`);
    const ethBefore = parseFloat(before.body.data.balances.ETH);
    assert.ok(ethBefore < 3.2);

    // Reset
    const resetRes = await request(app).post('/reset');
    assert.equal(resetRes.status, 200);

    // Check restored
    const after = await request(app).get(`/balance/${ADDR}`);
    const ethAfter = parseFloat(after.body.data.balances.ETH);
    assert.equal(ethAfter, 3.2);
  });
});
