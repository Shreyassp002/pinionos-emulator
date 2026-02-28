# PinionOS Emulator User Guide

This guide is for developers who want to build and test projects on PinionOS locally, without real payments.

## 1. Install the emulator

Install in your project:

```bash
npm install --save-dev pinion-emulator
```

Run it:

```bash
npx pinion-emulator
```

Default server URL:

```text
http://localhost:4020
```

Quick health check:

```bash
curl http://localhost:4020/health
```

## 2. Point your Pinion SDK to the emulator

For `pinion-os` SDK v0.4.0, pass `apiUrl` directly:

```ts
import { PinionClient } from 'pinion-os';

const client = new PinionClient({
  privateKey: process.env.PRIVATE_KEY!,
  apiUrl: 'http://localhost:4020'
});
```

Important:
- Do not rely on `PINION_API_URL` alone for SDK v0.4.0.
- Use constructor `apiUrl` so calls route to your local emulator.

## 3. Test a real workflow end-to-end

Run these commands in a second terminal while emulator is running:

```bash
# 1) Generate wallet
WALLET_JSON=$(curl -s http://localhost:4020/wallet/generate)
ADDR=$(echo "$WALLET_JSON" | jq -r '.data.address')
echo "Address: $ADDR"

# 2) Fund it (mock faucet)
curl -s "http://localhost:4020/fund/$ADDR" | jq

# 3) Check balance
curl -s "http://localhost:4020/balance/$ADDR" | jq

# 4) Build unsigned send tx
curl -s -X POST http://localhost:4020/send \
  -H 'Content-Type: application/json' \
  -d "{\"to\":\"0x0000000000000000000000000000000000000001\",\"amount\":\"0.01\",\"token\":\"ETH\",\"from\":\"$ADDR\"}" | jq

# 5) Build unsigned trade tx
curl -s -X POST http://localhost:4020/trade \
  -H 'Content-Type: application/json' \
  -d "{\"src\":\"ETH\",\"dst\":\"USDC\",\"amount\":\"0.001\",\"slippage\":1,\"from\":\"$ADDR\"}" | jq

# 6) Chat skill
curl -s -X POST http://localhost:4020/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"what is ETH price now?"}' | jq
```

## 4. Test x402 payment mode

Start emulator in x402 mode:

```bash
npx pinion-emulator --x402
```

Test 402 challenge:

```bash
curl -i "http://localhost:4020/balance/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
```

Get unlimited key and verify:

```bash
KEY=$(curl -s -X POST http://localhost:4020/unlimited -H 'Content-Type: application/json' -d '{}' | jq -r '.data.apiKey // .data.key')
curl -s "http://localhost:4020/unlimited/verify?key=$KEY" | jq
```

Use key on protected route:

```bash
curl -s "http://localhost:4020/balance/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" \
  -H "X-API-KEY: $KEY" | jq
```

## 5. Use in automated tests (CI/local)

Start emulator in background, run your app tests, then stop:

```bash
npx pinion-emulator --no-dashboard > /tmp/pinion-emulator.log 2>&1 & EMU_PID=$!
sleep 2
npm test
kill $EMU_PID
```

## 6. Optional: MCP mode for agent tooling

With emulator already running:

```bash
npx pinion-emulator mcp
```

If using a custom URL for MCP tools, set:

```bash
export PINION_EMULATOR_URL="http://localhost:4020"
```

## 7. What is included in the emulator

Core skill routes:
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

Supporting routes:
- `GET /health`
- `POST /reset`
- `POST /recording/start`
- `POST /recording/stop`
- `GET /recording/status`
- `POST /facilitator/verify`
- `GET /facilitator/status`
- `ALL /x402/*`

## 8. Troubleshooting

Port already in use:

```bash
npx pinion-emulator --port 4120
```

No terminal UI needed:

```bash
npx pinion-emulator --no-dashboard
```

Using custom config:

```bash
npx pinion-emulator --config ./config.json
```

If SDK calls still hit production:
- Confirm you passed `apiUrl: 'http://localhost:4020'` to `PinionClient`.
- Confirm emulator is running and `/health` works.
