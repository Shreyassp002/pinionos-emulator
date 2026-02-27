# PinionOS Emulator

A local TypeScript emulator for PinionOS skill APIs. Run this server to develop and demo agents without real USDC payments.

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

Use with SDK override:

```ts
process.env.PINION_API_URL = 'http://localhost:4020';
// or pass apiUrl directly in PinionClient for guaranteed routing:
// new PinionClient({ privateKey: '0x...', apiUrl: 'http://localhost:4020' })
```

## Routes

- `GET /price/:token`
- `GET /balance/:address`
- `GET /wallet`
- `GET /wallet/generate` (SDK-compatible alias)
- `GET /tx/:hash`
- `POST /send`
- `POST /trade`
- `GET /fund/:address`
- `POST /chat`
- `GET /unlimited`
- `POST /unlimited` (SDK-compatible alias)
- `GET /unlimited/verify/:key`
- `GET /unlimited/verify?key=...` (SDK-compatible alias)
- `POST /broadcast`

All successful responses follow:

```json
{
  "data": {},
  "mock": true,
  "payment": {
    "amount": "0.01",
    "token": "USDC",
    "status": "simulated",
    "txHash": null
  }
}
```

`/price/:token` resolution order:
1. `config.prices` numeric override
2. CoinGecko
3. Binance
4. `config.fallbackPrices` static fallback

Errors follow:

```json
{
  "error": "message",
  "mock": true
}
```

## MCP Mode

Start MCP stdio server:

```bash
npm run mcp
# or when installed/published:
npx pinion-emulator mcp
```

Claude Desktop snippet:

```json
{
  "mcpServers": {
    "pinion-emulator": {
      "command": "npm",
      "args": ["run", "mcp"]
    }
  }
}
```

## Fallback Client

If `PINION_API_URL` override does not intercept SDK calls in your environment, use [`MockPinionClient`](/home/shreyas/code/web3/pinionos-emulator/src/client/MockPinionClient.ts) to call emulator routes directly.
