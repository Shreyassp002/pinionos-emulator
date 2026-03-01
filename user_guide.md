# PinionOS Emulator — Testing Guide

Step-by-step guide for testing your product against the emulator. Each section is a specific thing you can test, with exact commands and what to expect.

---

## Prerequisites

**Local install (recommended for projects):**

```bash
npm install --save-dev @shreyassp002/pinionos-emulator
npx pinionos-emulator
```

**Global install:**

```bash
npm install -g @shreyassp002/pinionos-emulator
pinionos-emulator
```

Keep the terminal open. Confirm it's running:

```bash
curl -s http://localhost:4020/health | jq
# Expected: { "status": "ok", "emulator": true, "port": 4020 }
```

> All commands below use `npx pinionos-emulator`. If you installed globally, replace with `pinionos-emulator`.

---

## 1. Connect Your App to the Emulator

The only change in your app code is the `apiUrl`:

```ts
import { PinionClient } from 'pinion-os';

const client = new PinionClient({
  privateKey: process.env.PRIVATE_KEY!,
  apiUrl: 'http://localhost:4020'
});
```

Keep this in one place (a client factory file) so you can switch between local and production by changing one line.

**What to verify:**
- Your app starts without errors
- SDK calls reach the emulator (you'll see them in the terminal dashboard)
- Responses have the same shape your app expects

---

## 2. Test the Full Skill Chain

Run these in a second terminal to exercise every skill end-to-end.

### 2a. Generate a wallet

```bash
WALLET_JSON=$(curl -s http://localhost:4020/wallet/generate)
echo "$WALLET_JSON" | jq
ADDR=$(echo "$WALLET_JSON" | jq -r '.data.address')
echo "Wallet address: $ADDR"
```

Expected: JSON with `address` and `privateKey` fields.

### 2b. Fund the wallet

```bash
curl -s "http://localhost:4020/fund/$ADDR" | jq
```

Expected: Funding instructions and balance info.

### 2c. Check balance

```bash
curl -s "http://localhost:4020/balance/$ADDR" | jq
```

Expected: `ETH` and `USDC` balances (from config defaults).

### 2d. Get a price

```bash
curl -s http://localhost:4020/price/ETH | jq
```

Expected: `priceUSD`, `change24h`, `source` fields.

### 2e. Build a send transaction

```bash
curl -s -X POST http://localhost:4020/send \
  -H 'Content-Type: application/json' \
  -d "{\"to\":\"0x0000000000000000000000000000000000000001\",\"amount\":\"0.01\",\"token\":\"ETH\",\"from\":\"$ADDR\"}" | jq
```

Expected: Unsigned transaction object with `to`, `data`, `value` fields.

### 2f. Build a trade transaction

```bash
curl -s -X POST http://localhost:4020/trade \
  -H 'Content-Type: application/json' \
  -d "{\"src\":\"ETH\",\"dst\":\"USDC\",\"amount\":\"0.001\",\"slippage\":1,\"from\":\"$ADDR\"}" | jq
```

Expected: Swap transaction with price info, fee breakdown, output amount.

### 2g. Broadcast a transaction

```bash
curl -s -X POST http://localhost:4020/broadcast \
  -H 'Content-Type: application/json' \
  -d '{"tx":{"to":"0x0000000000000000000000000000000000000001","value":"1000000000000000"}}' | jq
```

Expected: Mock transaction hash and confirmation.

### 2h. Chat

```bash
curl -s -X POST http://localhost:4020/chat \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"what is ETH price now?"}]}' | jq
```

Expected: AI-style response with relevant info.

### 2i. Look up a transaction

```bash
curl -s "http://localhost:4020/tx/0xabc123def456" | jq
```

Expected: Deterministic mock transaction details (same hash = same result every time).

### 2j. Discover available skills

```bash
curl -s http://localhost:4020/catalog | jq
```

Expected: List of 9 skills with names, prices (`$0.01 USDC` each), and descriptions.

---

## 3. Test x402 Payment Flow

Start the emulator in x402 mode:

```bash
npx pinionos-emulator --x402
# or globally: pinionos-emulator --x402
```

### 3a. Confirm endpoints are gated

```bash
curl -i http://localhost:4020/price/ETH
```

Expected: HTTP 402 response with `x402Version` and `accepts` array containing payment requirements.

### 3b. Confirm free endpoints still work

```bash
curl -s http://localhost:4020/health | jq
curl -s http://localhost:4020/catalog | jq
```

Expected: Normal 200 responses. `/health` and `/catalog` are never gated.

### 3c. Issue an unlimited API key

```bash
KEY=$(curl -s -X POST http://localhost:4020/unlimited \
  -H 'Content-Type: application/json' -d '{}' | jq -r '.data.apiKey // .data.key')
echo "API Key: $KEY"
```

### 3d. Verify the key

```bash
curl -s "http://localhost:4020/unlimited/verify?key=$KEY" | jq
```

Expected: `{ "valid": true, ... }`

### 3e. Use the key to bypass x402

```bash
curl -s http://localhost:4020/price/ETH -H "X-API-KEY: $KEY" | jq
```

Expected: Normal price response (200, not 402).

### 3f. Test with an invalid key

```bash
curl -i http://localhost:4020/price/ETH -H "X-API-KEY: fake-key-123"
```

Expected: HTTP 401 `invalid api key`.

**What to verify in your app:**
- Your app handles 402 responses correctly (shows payment UI, retries with key, etc.)
- Your unlimited key flow works end-to-end
- Invalid/expired keys produce the right error UX

---

## 4. Test Error Handling and Resilience

Add error simulation to your `config.json`:

```json
{
  "errorSimulation": {
    "enabled": true,
    "rules": [
      {
        "route": "/trade",
        "errorRate": 0.5,
        "statusCode": 503,
        "message": "temporary upstream issue"
      },
      {
        "route": "/price",
        "errorRate": 0.2,
        "statusCode": 500,
        "message": "price feed unavailable"
      }
    ]
  }
}
```

Restart the emulator, then hit the affected endpoints multiple times:

```bash
for i in {1..10}; do
  echo "--- Request $i ---"
  curl -s -o /dev/null -w "HTTP %{http_code}" http://localhost:4020/price/ETH
  echo
done
```

**What to verify in your app:**
- Retry logic triggers on 5xx errors
- Fallback UI shows appropriate messages
- App doesn't crash on unexpected status codes
- Logging/telemetry captures the failures

---

## 5. Test Custom Balances

Edit `config.json` to set specific balances for addresses your app uses:

```json
{
  "balances": {
    "default": { "ETH": "1.5", "USDC": "250.00" },
    "0xYourTestAddress": { "ETH": "0.001", "USDC": "0.50" }
  }
}
```

Restart emulator, then:

```bash
# This address gets the custom low balance
curl -s http://localhost:4020/balance/0xYourTestAddress | jq

# Any other address gets the default
curl -s http://localhost:4020/balance/0xSomeOtherAddress | jq
```

**What to verify in your app:**
- Insufficient balance warnings appear correctly
- Your app handles edge cases (near-zero balances, exact amounts)

---

## 6. Test State Mutation and Reset

Balances change when you send or trade. To start fresh:

```bash
# Reset everything to config defaults
curl -s -X POST http://localhost:4020/reset | jq
```

Expected: `{ "message": "All balances and API keys reset to defaults" }`

This also clears all issued unlimited keys.

**What to verify in your app:**
- After a send, balance reflects the deduction
- After reset, your app re-fetches correct state

---

## 7. Record and Inspect Requests

Enable recording to capture exactly what your app sends to the emulator:

```bash
# Start recording
curl -s -X POST http://localhost:4020/recording/start | jq

# ... run your app / tests ...

# Stop recording
curl -s -X POST http://localhost:4020/recording/stop | jq
```

Captured requests are written to `pinion-requests.jsonl` in the emulator's working directory. Each line is a JSON object with method, path, headers, body, response status, and timing.

**What to verify:**
- Your app sends the expected headers and body shapes
- No unnecessary duplicate calls
- Request ordering matches your expected flow

---

## 8. Test MCP Integration

For AI agents using Model Context Protocol:

**Terminal 1** — start the emulator:

```bash
npx pinionos-emulator
# or globally: pinionos-emulator
```

**Terminal 2** — start the MCP server:

```bash
npx pinionos-emulator mcp
# or globally: pinionos-emulator mcp
```

The MCP server connects to the running emulator and exposes all skills as MCP tools.

### MCP wallet setup

Before using paid tools, the MCP server requires wallet setup:

- `pinion_setup` with `action: "generate"` — creates a new wallet
- `pinion_setup` with `action: "import"` and `private_key` — uses an existing key

Without this, all paid tool calls return: `"Wallet not configured. Call pinion_setup first."`

### MCP spend limits

To test budget-aware agents:

- `pinion_spend_limit` with `action: "set"`, `max_usdc: "0.05"` — sets a $0.05 limit (5 calls at $0.01 each)
- `pinion_spend_limit` with `action: "status"` — check remaining budget
- `pinion_spend_limit` with `action: "clear"` — remove the limit

Once the budget is exhausted, further paid tool calls return a spend limit error.

### MCP skill discovery

- `pinion_catalog` — returns all available skills with prices, no wallet required

---

## 9. Test with Different Networks

```bash
npx pinionos-emulator --network base-sepolia
# or globally: pinionos-emulator --network base-sepolia
```

```bash
curl -s http://localhost:4020/catalog | jq '.network'
# Expected: "base-sepolia"
```

**What to verify:**
- Your app reads and displays the correct network name
- USDC contract addresses match the expected network

---

## 10. Run in CI

```bash
# Start emulator in background (local install)
npx pinionos-emulator --no-dashboard > /tmp/pinionos-emulator.log 2>&1 & EMU_PID=$!
# or globally: pinionos-emulator --no-dashboard > /tmp/pinionos-emulator.log 2>&1 & EMU_PID=$!
sleep 2

# Verify it started
curl -sf http://localhost:4020/health || { echo "Emulator failed to start"; cat /tmp/pinionos-emulator.log; exit 1; }

# Run your tests
npm test

# Tear down
kill $EMU_PID
```

**Typical CI assertions:**
- API responses match expected JSON schemas
- User-facing error messages map correctly from upstream errors
- Transaction previews render when `/send` or `/trade` succeeds
- Retry logic works under error simulation

---

## 11. Common Issues

| Problem | Fix |
|---------|-----|
| App still calls production | Check that `apiUrl: 'http://localhost:4020'` is actually passed at runtime, not just in config files |
| Port conflict | Use `npx pinionos-emulator --port 4120` or `pinionos-emulator --port 4120` |
| Config not loading | Use `--config ./path/to/config.json` |
| Emulator crashes on start | Check `config.json` is valid JSON with required fields (`port`, `balances.default`) |
| SDK ignores `PINION_API_URL` env var | SDK v0.4.0 does not read this env var — you must pass `apiUrl` in the constructor |
| x402 returns 402 on everything | Make sure you're passing `X-API-KEY` header or start without `--x402` |
| MCP tools return "wallet not configured" | Call `pinion_setup` first, or set `PINION_PRIVATE_KEY` env var |
