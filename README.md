<div align="center">

# PinionOS Emulator

**Local PinionOS-compatible backend for product development and testing**

Test your app with the same `pinion-os` SDK calls, without real USDC spend.

</div>

## What This Project Is

`pinion-emulator` is a local server that mirrors Pinion skill APIs so teams can build and test products safely.

Use it when you want to:
- develop app flows without hitting production
- run deterministic integration tests in CI
- exercise x402/unlimited-key paths locally
- inspect request/response behavior in a terminal dashboard

## Pinion SDK Compatibility

This emulator is designed for `pinion-os` client usage by pointing the SDK to local URL:

```ts
import { PinionClient } from 'pinion-os';

const client = new PinionClient({
  privateKey: process.env.PRIVATE_KEY!,
  apiUrl: 'http://localhost:4020'
});
```

## Supported SDK Skills

| Skill | SDK Method | Emulator Endpoint | Status |
|---|---|---|---|
| balance | `skills.balance(address)` | `GET /balance/:address` | Supported |
| tx | `skills.tx(hash)` | `GET /tx/:hash` | Supported |
| price | `skills.price(token)` | `GET /price/:token` | Supported |
| wallet | `skills.wallet()` | `GET /wallet/generate` | Supported |
| chat | `skills.chat(message)` | `POST /chat` | Supported |
| send | `skills.send(to, amount, token)` | `POST /send` | Supported |
| trade | `skills.trade(src, dst, amount, slippage)` | `POST /trade` | Supported |
| fund | `skills.fund(address)` | `GET /fund/:address` | Supported |
| broadcast | `skills.broadcast(tx)` | `POST /broadcast` | Supported |
| unlimited | `skills.unlimited()` | `POST /unlimited` | Supported |
| unlimited-verify | `skills.unlimitedVerify(key)` | `GET /unlimited/verify?key=...` | Supported |

## Supported MCP Tools

Your emulator MCP server currently exposes:
- `pinion_price`
- `pinion_balance`
- `pinion_wallet`
- `pinion_tx`
- `pinion_chat`
- `pinion_send`
- `pinion_trade`
- `pinion_fund`
- `pinion_broadcast`
- `pinion_unlimited`
- `pinion_unlimited_verify`
- `pinion_pay_service`
- `pinion_facilitator_verify`

## Emulator Features Beyond Core Skills

- x402 middleware mode (`--x402`) with 402 challenge flow
- unlimited API key issuance and verification
- generic x402 test service (`/x402/*`)
- mock facilitator endpoints (`/facilitator/verify`, `/facilitator/status`)
- request recording (`/recording/start`, `/recording/stop`, `/recording/status`)
- chaos/error injection via config (`errorSimulation`)
- mutable in-memory balances + reset (`POST /reset`)
- terminal dashboard (feed, prices, wallet, inspector)

## Quick Start

```bash
npm install
npm start
```

Health check:

```bash
curl -s http://localhost:4020/health | jq
```

Headless mode:

```bash
npx pinion-emulator --no-dashboard
```

## CLI Commands

```bash
pinion-emulator start
pinion-emulator mcp
pinion-emulator init
```

Useful options:
- `--port <n>`
- `--x402`
- `--network base|base-sepolia`
- `--no-dashboard`
- `--config <path>`

## Product Testing Workflow

1. Start emulator locally.
2. Configure your app's Pinion client with `apiUrl: 'http://localhost:4020'`.
3. Run your app and test suite.
4. Assert your product behavior (not just raw route responses).

CI example:

```bash
npx pinion-emulator --no-dashboard > /tmp/pinion-emulator.log 2>&1 & EMU_PID=$!
sleep 2
npm test
kill $EMU_PID
```

## Route Summary

Core routes:
- `GET /price/:token`
- `GET /balance/:address`
- `GET /wallet`
- `GET /wallet/generate`
- `GET /tx/:hash`
- `POST /send`
- `POST /trade`
- `GET /fund/:address`
- `POST /chat`
- `POST /broadcast`
- `GET /unlimited`
- `POST /unlimited`
- `GET /unlimited/verify?key=...`
- `GET /unlimited/verify/:key`

System routes:
- `GET /`
- `GET /health`
- `POST /reset`
- `POST /recording/start`
- `POST /recording/stop`
- `GET /recording/status`
- `POST /facilitator/verify`
- `GET /facilitator/status`
- `ALL /x402/*`

## Notes On Behavior

- Responses are mock/simulated with realistic structure.
- Success envelope includes `mock: true` and payment metadata.
- Price path uses config override -> CoinGecko -> Binance -> fallback.
- This is for development/testing, not production settlement.

## Documentation

- Detailed usage and testing guide: [user_guide.md](user_guide.md)
- Planning/spec docs: [`docs/`](docs)

## License

MIT
