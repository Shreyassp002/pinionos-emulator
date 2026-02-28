# PinionOS Emulator

A local TypeScript emulator for PinionOS skill APIs. Run this server to develop and test agents without real USDC payments — all skill calls are free and return realistic mock data.

## Full User Guide

For a complete install + integration + testing workflow, see:

- [docs/user_guide.md](docs/user_guide.md)

## Quick Start

```bash
npm install
npm start
```

Health check:

```bash
curl http://localhost:4020/health
```

`npm start` launches the terminal dashboard UI and the emulator server together.
Press `q` or `Ctrl+C` to exit cleanly.

## SDK Integration

The `pinion-os` SDK v0.4.0 does **not** read `PINION_API_URL` from the environment. You must pass `apiUrl` directly in the constructor:

```ts
import { PinionClient } from 'pinion-os';

const client = new PinionClient({
  privateKey: '0xYourPrivateKey',
  apiUrl: 'http://localhost:4020'   // ← required to route to emulator
});

// All skill calls are now free and routed locally
const price = await client.skills.price('ETH');
console.log(price.data.priceUSD);
```

## MockPinionClient

If you can't use the `PinionClient` constructor directly, use `MockPinionClient` instead. It returns the same `SkillResponse<T>` shape as the real SDK:

```ts
import { MockPinionClient } from './src/client/MockPinionClient';

const client = new MockPinionClient({ baseUrl: 'http://localhost:4020' });

const price = await client.skills.price('ETH');
console.log(price.data.priceUSD);  // number

const wallet = await client.skills.wallet();
console.log(wallet.data.address);  // string

const trade = await client.skills.trade('ETH', 'USDC', '0.5', 1);
console.log(trade.data.swap);      // UnsignedTx
```

## Routes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/price/:token` | USD price for ETH, BTC, SOL, USDC, MATIC |
| `GET` | `/balance/:address` | ETH + USDC balances |
| `GET` | `/wallet` | Generate wallet keypair |
| `GET` | `/wallet/generate` | SDK-compatible alias |
| `GET` | `/tx/:hash` | Deterministic tx lookup (same hash → same result) |
| `POST` | `/send` | Build unsigned ETH/ERC-20 transfer tx |
| `POST` | `/trade` | Build unsigned swap tx via Uniswap V3 |
| `GET` | `/fund/:address` | Funding instructions for address |
| `POST` | `/chat` | Chat with mock AI agent |
| `GET` | `/unlimited` | Issue unlimited API key |
| `POST` | `/unlimited` | SDK-compatible alias |
| `GET` | `/unlimited/verify?key=...` | Verify key (flat response, no envelope) |
| `POST` | `/broadcast` | Simulate broadcast, returns explorer URL |

### `/send` supported tokens
`ETH`, `USDC` (6 dec), `WETH` (18 dec), `DAI` (18 dec), `WBTC` (8 dec), `CBETH` (18 dec)

### `/trade` notes
- Uses real prices from CoinGecko → Binance → config fallback
- Rejects same-token swaps
- Respects `slippage` parameter (default: 1%)
- Applies 0.3% Uniswap V3 fee to output

### Response envelope

All successful responses:
```json
{
  "data": { "...": "..." },
  "mock": true,
  "payment": { "amount": "0.01", "token": "USDC", "status": "simulated", "txHash": null }
}
```
Fields from `data` are also spread at the root level for convenience.

Error responses:
```json
{ "error": "message", "mock": true }
```

### Price resolution order
1. `config.prices` — numeric override or `"useApi:coingecko"` / `"useApi:binance"`
2. CoinGecko (60s cache)
3. Binance (60s cache)
4. `config.fallbackPrices` — static fallback

## config.json

```json
{
  "port": 4020,
  "mockPayments": true,
  "prices": {
    "ETH": "useApi:coingecko",
    "USDC": 1
  },
  "fallbackPrices": {
    "ETH": 3000,
    "USDC": 1
  },
  "balances": {
    "default": { "ETH": "1.5", "USDC": "250.00" },
    "0xYourAddress": { "ETH": "3.2", "USDC": "500.00" }
  }
}
```

`config.json` is required at project root. Missing or invalid JSON throws a clear error at startup.

## MCP Mode

Requires the emulator to be running (`npm start`) first.

```bash
npm run mcp
```

Claude Desktop:
```json
{
  "mcpServers": {
    "pinion-emulator": {
      "command": "npm",
      "args": ["run", "mcp"],
      "cwd": "/path/to/pinion-emulator"
    }
  }
}
```

Available MCP tools: `pinion_price`, `pinion_balance`, `pinion_wallet`, `pinion_tx`, `pinion_chat`, `pinion_send`, `pinion_trade`, `pinion_fund`, `pinion_broadcast`, `pinion_unlimited`, `pinion_unlimited_verify`

## Terminal Dashboard

The dashboard shows live status across 5 panels:

| Panel | Content |
|-------|---------|
| Header | ASCII banner, server URL, call count, error count, uptime |
| Live Prices | ETH/BTC/SOL/USDC prices with 24h change arrows (▲/▼) |
| Mock Wallet | Default ETH/USDC balance, keys issued, address |
| Skill Call Feed | Every API call: method, route, status code, result, cost |
| Inspector | Full request/response JSON for the last call |

The prices panel auto-refreshes every 30 seconds using a single batched CoinGecko request.
