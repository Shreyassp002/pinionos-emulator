# PinionOS Emulator

Local TypeScript emulator for PinionOS skill APIs.

Use this to test products built on PinionOS without spending real USDC:
- your app still calls `client.skills.*`
- calls are routed to `localhost`
- responses stay realistic and stable for development/testing

## How Product Teams Use This

1. Start the emulator locally.
2. Point your Pinion client to `http://localhost:4020`.
3. Run your app and product tests normally.

That is the full loop. Your product code does not need Pinion production while developing.

## Quick Start

```bash
npm install
npm start
```

`npm start` launches the emulator + terminal dashboard.

Health check:

```bash
curl http://localhost:4020/health
```

Headless mode (better for CI):

```bash
npx pinion-emulator --no-dashboard
```

## Wire Your App To Emulator

`pinion-os` SDK v0.4.0 requires passing `apiUrl` directly:

```ts
import { PinionClient } from 'pinion-os';

export const pinion = new PinionClient({
  privateKey: process.env.PRIVATE_KEY!,
  apiUrl: 'http://localhost:4020'
});
```

Then your existing product code can stay unchanged:

```ts
const quote = await pinion.skills.trade('ETH', 'USDC', '0.1', 1);
```

## Example Product Test Flow

For a wallet assistant product, this is a typical integration flow:

1. `skills.wallet()` creates a user wallet.
2. `skills.fund(address)` prepares mock balance.
3. `skills.balance(address)` confirms portfolio state.
4. `skills.trade(...)` builds swap transaction.
5. `skills.send(...)` builds transfer transaction.
6. Product UI/API validates and displays those results.

This validates your product behavior end-to-end without real chain activity.

## x402 Testing

Use x402 mode to test payment-gated behavior:

```bash
npx pinion-emulator --x402
```

You can test:
- `402` responses for unpaid requests
- unlimited key issue/verify flow
- protected calls with `X-API-KEY`

## CI Recipe

Run emulator in background, execute product tests, stop emulator:

```bash
npx pinion-emulator --no-dashboard > /tmp/pinion-emulator.log 2>&1 & EMU_PID=$!
sleep 2
npm test
kill $EMU_PID
```

## API Coverage

Core skill-compatible routes:
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

## More Documentation

- Full workflow guide: [user_guide.md](user_guide.md)
- Project plan/spec docs: `docs/`
