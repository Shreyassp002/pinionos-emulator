import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../../src/app';
import { resetBalances } from '../../src/state/balances';
import { setCliOverrides } from '../../src/config';

let server: http.Server;
let baseUrl: string;

before(async () => {
  setCliOverrides({});
  resetBalances();
  const { app, config } = createApp();
  const port = config.port + 100; // avoid collision with running emulator
  server = app.listen(port);
  baseUrl = `http://localhost:${port}`;
});

after(() => {
  server.close();
});

beforeEach(() => {
  resetBalances();
});

async function fetchJson(path: string, opts?: RequestInit) {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  const body = await res.json();
  return { status: res.status, body };
}

describe('SDK integration — full workflow', () => {
  it('wallet → fund → balance → send → trade → tx → chat → unlimited flow', async () => {
    // 1. Generate wallet
    const wallet = await fetchJson('/wallet/generate');
    assert.equal(wallet.status, 200);
    assert.match(wallet.body.data.address, /^0x[0-9a-fA-F]{40}$/);
    assert.ok(wallet.body.data.privateKey);
    assert.equal(wallet.body.mock, true);
    const addr = wallet.body.data.address;

    // 2. Fund wallet
    const fund = await fetchJson(`/fund/${addr}`);
    assert.equal(fund.status, 200);
    assert.ok(fund.body.data.depositAddress);

    // 3. Check balance
    const balance = await fetchJson(`/balance/${addr}`);
    assert.equal(balance.status, 200);
    assert.ok(parseFloat(balance.body.data.balances.ETH) > 0);
    assert.ok(parseFloat(balance.body.data.balances.USDC) > 0);

    // 4. Send some USDC
    const receiver = '0x0000000000000000000000000000000000000001';
    const send = await fetchJson('/send', {
      method: 'POST',
      body: JSON.stringify({ to: receiver, amount: '5', token: 'USDC', from: addr }),
    });
    assert.equal(send.status, 200);
    assert.equal(send.body.data.token, 'USDC');
    assert.ok(send.body.data.tx);

    // 5. Trade ETH → USDC
    const trade = await fetchJson('/trade', {
      method: 'POST',
      body: JSON.stringify({ src: 'ETH', dst: 'USDC', amount: '0.001', slippage: 1, from: addr }),
    });
    assert.equal(trade.status, 200);
    assert.ok(trade.body.data.toAmount);
    assert.ok(trade.body.data.swap);

    // 6. Look up a tx hash
    const txHash = '0x' + 'ab'.repeat(32);
    const tx = await fetchJson(`/tx/${txHash}`);
    assert.equal(tx.status, 200);
    assert.equal(tx.body.data.hash, txHash);
    assert.ok(tx.body.data.from);
    assert.ok(tx.body.data.to);

    // 7. Chat
    const chat = await fetchJson('/chat', {
      method: 'POST',
      body: JSON.stringify({ message: 'what is the price of ETH?' }),
    });
    assert.equal(chat.status, 200);
    assert.ok(chat.body.data.reply);
    assert.match(chat.body.data.reply, /ETH/i);

    // 8. Get unlimited API key
    const unlimited = await fetchJson('/unlimited', { method: 'POST', body: '{}' });
    assert.equal(unlimited.status, 200);
    const apiKey = unlimited.body.data.key ?? unlimited.body.data.apiKey;
    assert.ok(apiKey);

    // 9. Verify API key
    const verify = await fetchJson(`/unlimited/verify?key=${apiKey}`);
    assert.equal(verify.status, 200);
    assert.equal(verify.body.valid, true);

    // 10. Broadcast
    const broadcast = await fetchJson('/broadcast', {
      method: 'POST',
      body: JSON.stringify({ signedTx: '0xdeadbeef' }),
    });
    assert.equal(broadcast.status, 200);
    assert.ok(broadcast.body.data.txHash);

    // 11. Verify all responses have mock: true
    for (const res of [wallet, fund, balance, send, trade, tx, chat, unlimited, broadcast]) {
      assert.equal(res.body.mock, true, `Expected mock: true for response`);
    }
  });

  it('price endpoint returns USD price', async () => {
    const res = await fetchJson('/price/USDC');
    assert.equal(res.status, 200);
    assert.ok(res.body.data.priceUSD !== undefined || res.body.data.usd !== undefined);
  });

  it('reset restores state', async () => {
    const addr = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

    // Mutate
    await fetchJson('/send', {
      method: 'POST',
      body: JSON.stringify({ to: '0x0000000000000000000000000000000000000001', amount: '0.5', token: 'ETH', from: addr }),
    });

    // Reset
    const reset = await fetchJson('/reset', { method: 'POST', body: '{}' });
    assert.equal(reset.status, 200);

    // Verify restored
    const balance = await fetchJson(`/balance/${addr}`);
    assert.equal(parseFloat(balance.body.data.balances.ETH), 3.2);
  });
});
