# PinionOS Emulator User Guide

This guide explains how teams building products on PinionOS should use this emulator to test their own app behavior.

## What You Are Testing

You are not just testing emulator routes. You are testing your product logic:
- your backend/API handlers
- your agent orchestration
- your UI behavior
- your error handling and fallback paths

The emulator replaces Pinion backend calls during development.

## Product Testing Model

Your app code:

```text
Product code -> pinion-os SDK -> PinionOS Emulator (localhost) -> mock responses
```

This means your real integration points stay intact (`client.skills.*`), but everything runs locally and predictably.

## 1. Install And Run

Install in your project:

```bash
npm install --save-dev pinion-emulator
```

Start emulator:

```bash
npx pinion-emulator
```

Headless mode for scripts/CI:

```bash
npx pinion-emulator --no-dashboard
```

Health check:

```bash
curl http://localhost:4020/health
```

## 2. Point SDK Calls To Emulator

For `pinion-os` SDK v0.4.0, pass `apiUrl` explicitly:

```ts
import { PinionClient } from 'pinion-os';

export const pinion = new PinionClient({
  privateKey: process.env.PRIVATE_KEY!,
  apiUrl: 'http://localhost:4020'
});
```

Important:
- Do not rely only on `PINION_API_URL` with SDK v0.4.0.
- Keep this in one place (client factory) so switching between local/prod is easy.

## 3. Example: Testing A Real Product Feature

Example product: "trade assistant" API endpoint `/api/trade-preview`.

Your endpoint may do:
1. read user wallet
2. call `skills.balance(address)`
3. call `skills.trade(src, dst, amount, slippage)`
4. return preview payload to frontend

With emulator running, your test validates your endpoint behavior:
- successful preview response shape
- insufficient balance handling
- invalid token handling
- slippage validation errors

You are validating your product contract, not emulator internals.

## 4. Smoke-Test The Full Skill Chain

Run these commands in a second terminal:

```bash
# 1) Create wallet
WALLET_JSON=$(curl -s http://localhost:4020/wallet/generate)
ADDR=$(echo "$WALLET_JSON" | jq -r '.data.address')

# 2) Add mock funds
curl -s "http://localhost:4020/fund/$ADDR" | jq

# 3) Verify balances
curl -s "http://localhost:4020/balance/$ADDR" | jq

# 4) Build send tx
curl -s -X POST http://localhost:4020/send \
  -H 'Content-Type: application/json' \
  -d "{\"to\":\"0x0000000000000000000000000000000000000001\",\"amount\":\"0.01\",\"token\":\"ETH\",\"from\":\"$ADDR\"}" | jq

# 5) Build trade tx
curl -s -X POST http://localhost:4020/trade \
  -H 'Content-Type: application/json' \
  -d "{\"src\":\"ETH\",\"dst\":\"USDC\",\"amount\":\"0.001\",\"slippage\":1,\"from\":\"$ADDR\"}" | jq

# 6) Chat request
curl -s -X POST http://localhost:4020/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"what is ETH price now?"}' | jq
```

## 5. Add Emulator To Your Automated Tests

Use one command to bring emulator up, run tests, tear down:

```bash
npx pinion-emulator --no-dashboard > /tmp/pinion-emulator.log 2>&1 & EMU_PID=$!
sleep 2
npm test
kill $EMU_PID
```

Typical assertions in your product tests:
- API returns expected JSON schema
- user-facing error messages map correctly on upstream 4xx/5xx
- transaction previews are shown when `/send` or `/trade` succeeds
- retry/backoff logic handles transient failures

## 6. Test x402 And Paid Access Flows

Start x402 mode:

```bash
npx pinion-emulator --x402
```

Verify gated behavior:

```bash
curl -i "http://localhost:4020/balance/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
```

Issue and verify unlimited key:

```bash
KEY=$(curl -s -X POST http://localhost:4020/unlimited -H 'Content-Type: application/json' -d '{}' | jq -r '.data.apiKey // .data.key')
curl -s "http://localhost:4020/unlimited/verify?key=$KEY" | jq
```

Use key on protected call:

```bash
curl -s "http://localhost:4020/balance/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" \
  -H "X-API-KEY: $KEY" | jq
```

## 7. Test Failure Scenarios (Recommended)

Use config-driven error simulation to verify your product resilience:

```json
{
  "errorSimulation": {
    "enabled": true,
    "rules": [
      { "route": "/trade", "errorRate": 0.3, "statusCode": 503, "message": "temporary upstream issue" }
    ]
  }
}
```

Then validate:
- retries
- fallback messaging
- telemetry/logging
- safe UI state after failure

## 8. Observe Requests While Testing

Enable recording mode:

```bash
curl -X POST http://localhost:4020/recording/start
```

Stop recording:

```bash
curl -X POST http://localhost:4020/recording/stop
```

Captured interactions are written to:

```text
pinion-requests.jsonl
```

This is useful for debugging how your product actually used the emulator.

## 9. Available Emulator Endpoints

Core skill-style routes:
- `GET /price/:token`
- `GET /balance/:address`
- `GET /wallet/generate`
- `GET /tx/:hash`
- `POST /send`
- `POST /trade`
- `GET /fund/:address`
- `POST /chat`
- `POST /broadcast`
- `POST /unlimited`
- `GET /unlimited/verify?key=...`

System routes:
- `GET /health`
- `POST /reset`
- `POST /recording/start`
- `POST /recording/stop`
- `GET /recording/status`
- `POST /facilitator/verify`
- `GET /facilitator/status`
- `ALL /x402/*`

## 10. Common Issues

Port conflict:

```bash
npx pinion-emulator --port 4120
```

Custom config file:

```bash
npx pinion-emulator --config ./config.json
```

If your app still calls production:
1. check `apiUrl: 'http://localhost:4020'` is actually passed in runtime
2. check emulator is running (`/health`)
3. check your app environment is not overriding client construction
