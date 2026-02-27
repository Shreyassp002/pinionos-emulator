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
