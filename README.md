<div align="center">

<img src="https://github.com/Shreyassp002/pinionos-emulator/blob/main/assets/logo.jpg" alt="PinionOS Emulator Logo" width="220" />

# PinionOS Emulator

**Local PinionOS-compatible backend for product development and testing**

Test your app with the same `pinion-os` SDK calls, without real USDC spend.

</div>

## What This Is

`pinionos-emulator` is a local server that mimics the real PinionOS skill API. You run it on your machine, point the `pinion-os` SDK at `localhost:4020`, and your entire app works exactly as it would in production — except every call is free, instant, and returns mock data.

```text
Your app code  -->  pinion-os SDK  -->  PinionOS Emulator (localhost:4020)  -->  mock responses
```

Your app code does not change. You only swap the URL.

## Quick Start

### 1. Install

**Local install (recommended for projects):**

```bash
npm install --save-dev @shreyassp002/pinionos-emulator
```

**Global install:**

```bash
npm install -g @shreyassp002/pinionos-emulator
```

### 2. Start the emulator

```bash
# Local install
npx pinionos-emulator

# Global install
pinionos-emulator
```

This opens a terminal dashboard with live prices, a skill call feed, wallet info, and request inspector.

For headless/CI mode:

```bash
npx pinionos-emulator --no-dashboard
# or
pinionos-emulator --no-dashboard
```

### 3. Verify it's running

```bash
curl -s http://localhost:4020/health | jq
```

### 4. Point your SDK at it

```ts
import { PinionClient } from 'pinion-os';

const client = new PinionClient({
  privateKey: process.env.PRIVATE_KEY!,
  apiUrl: 'http://localhost:4020'   // <-- this is the only change
});

// Everything else stays the same
const price = await client.skills.price('ETH');
const wallet = await client.skills.wallet();
```

That's it. Your app now talks to the emulator instead of production.

## CLI Reference

```
pinionos-emulator [command] [options]
```

**Commands:**

| Command | Description |
|---------|-------------|
| `start` | Start the emulator (default, can be omitted) |
| `mcp` | Start MCP stdio server (emulator must already be running) |
| `init` | Generate a starter `config.json` in the current directory |

**Options:**

| Flag | Description |
|------|-------------|
| `--port <n>` | Port to listen on (default: 4020) |
| `--x402` | Enable x402 payment simulation mode |
| `--network <name>` | `base` (default) or `base-sepolia` |
| `--no-dashboard` | Run without the terminal dashboard UI |
| `--config <path>` | Path to config.json (default: `./config.json`) |

**Examples (local install with npx):**

```bash
npx pinionos-emulator                       # Start with defaults + dashboard
npx pinionos-emulator start                 # Same as above (start is default)
npx pinionos-emulator --port 3000 --x402    # Custom port + x402 mode
npx pinionos-emulator --no-dashboard        # Headless for CI
npx pinionos-emulator init                  # Create config.json
npx pinionos-emulator mcp                   # Start MCP server
```

**Examples (global install):**

```bash
pinionos-emulator                       # Start with defaults + dashboard
pinionos-emulator start                 # Same as above (start is default)
pinionos-emulator --port 3000 --x402    # Custom port + x402 mode
pinionos-emulator --no-dashboard        # Headless for CI
pinionos-emulator init                  # Create config.json
pinionos-emulator mcp                   # Start MCP server
```

## Supported Skills

Every skill from the `pinion-os` SDK is supported:

| Skill | SDK Method | Emulator Endpoint |
|-------|-----------|-------------------|
| Price | `skills.price('ETH')` | `GET /price/:token` |
| Balance | `skills.balance(address)` | `GET /balance/:address` |
| Wallet | `skills.wallet()` | `GET /wallet/generate` |
| Transaction | `skills.tx(hash)` | `GET /tx/:hash` |
| Chat | `skills.chat(message, history?)` | `POST /chat` |
| Send | `skills.send(to, amount, token)` | `POST /send` |
| Trade | `skills.trade(src, dst, amount, slippage?)` | `POST /trade` |
| Fund | `skills.fund(address)` | `GET /fund/:address` |
| Broadcast | `skills.broadcast(tx, privateKey?)` | `POST /broadcast` |
| Unlimited | `skills.unlimited()` | `POST /unlimited` |
| Unlimited Verify | `skills.unlimitedVerify(key)` | `GET /unlimited/verify?key=...` |
| Catalog | `GET /catalog` | `GET /catalog` |

## System Endpoints

These are emulator-specific endpoints for testing and debugging:

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `POST /reset` | Reset all balances and API keys to defaults |
| `GET /catalog` | List all available skills with prices |
| `POST /recording/start` | Start recording all requests |
| `POST /recording/stop` | Stop recording |
| `GET /recording/status` | Check recording status |
| `POST /facilitator/verify` | Mock x402 facilitator verification |
| `GET /facilitator/status` | Facilitator status |
| `ALL /x402/*` | Generic x402 test service |

## MCP Tools

For AI agents using Model Context Protocol, start the MCP server:

```bash
npx pinionos-emulator mcp
```

The emulator must already be running in another terminal.

**Available tools:**

| Tool | Description |
|------|-------------|
| `pinion_setup` | Configure wallet (required before paid tools) |
| `pinion_spend_limit` | Set/check/clear spend budget |
| `pinion_catalog` | List available skills and prices |
| `pinion_price` | Get token price |
| `pinion_balance` | Get wallet balances |
| `pinion_wallet` | Generate wallet |
| `pinion_tx` | Look up transaction |
| `pinion_chat` | Chat with AI agent |
| `pinion_send` | Build send transaction |
| `pinion_trade` | Build swap transaction |
| `pinion_fund` | Get funding instructions |
| `pinion_broadcast` | Sign and broadcast transaction |
| `pinion_unlimited` | Purchase unlimited access |
| `pinion_unlimited_verify` | Verify API key |
| `pinion_pay_service` | Call generic x402 service |
| `pinion_facilitator_verify` | Verify x402 payment |

## Configuration

Run `pinionos-emulator init` to generate a `config.json`:

```json
{
  "port": 4020,
  "mockPayments": true,
  "prices": {
    "ETH": "useApi:coingecko",
    "BTC": "useApi:coingecko",
    "SOL": "useApi:coingecko",
    "USDC": 1
  },
  "fallbackPrices": {
    "ETH": 3000,
    "BTC": 90000,
    "SOL": 180,
    "USDC": 1
  },
  "balances": {
    "default": { "ETH": "1.5", "USDC": "250.00" }
  }
}
```

**Price resolution order:** config override -> CoinGecko API -> Binance API -> fallback prices.

**Price values can be:**
- A number (e.g. `1`) — fixed override
- `"useApi:coingecko"` — fetch from CoinGecko (60s cache)
- `"useApi:binance"` — fetch from Binance (60s cache)
- Absent — uses `fallbackPrices` value

**Custom balances:** Add wallet addresses as keys under `balances` to set specific balances. Any unknown address gets the `default` balance.

## Emulator Features

- **Terminal dashboard** — live skill call feed, price tickers, wallet info, request inspector
- **x402 mode** — full 402 payment challenge flow with `--x402` flag
- **Unlimited keys** — issue and verify API keys via `/unlimited`
- **Request recording** — capture all requests to `pinion-requests.jsonl` for debugging
- **Error simulation** — inject failures via config for resilience testing
- **Mutable balances** — balances update on send/trade, reset with `POST /reset`
- **Skill catalog** — `GET /catalog` for agent auto-discovery
- **MCP server** — full MCP tool set with wallet setup and spend tracking

## Notes

- All responses include `mock: true` and a simulated payment receipt.
- The success envelope spreads data at root level AND nests under `data`, so both `result.priceUSD` and `result.data.priceUSD` work.
- `/tx/:hash` is deterministic — same hash always returns the same addresses.
- `/trade` rejects same-token swaps and applies 0.3% fee + slippage.
- This is for development and testing only, not production settlement.

## Documentation

- Testing guide: [user_guide.md](user_guide.md)
- Planning docs: [`docs/`](docs)

## License

MIT
