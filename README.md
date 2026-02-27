# PinionOS Emulator

A local TypeScript emulator for PinionOS skill APIs. Run this server to develop and demo agents without real USDC payments.

## Quick Start

```bash
npm install
npm run dev
```

Health check:

```bash
curl http://localhost:4020/health
```

Use with SDK override:

```ts
process.env.PINION_API_URL = 'http://localhost:4020';
```

## Routes

- `GET /price/:token`
- `GET /balance/:address`
- `GET /wallet`
- `GET /tx/:hash`
- `POST /send`
- `POST /trade`
- `GET /fund/:address`
- `POST /chat`
- `GET /unlimited`
- `GET /unlimited/verify/:key`
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
