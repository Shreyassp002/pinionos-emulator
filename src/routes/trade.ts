import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { fetchBinancePrice } from '../freeApis/binance';
import { errorResponse, success } from '../types';

const router = Router();

async function priceInUsd(token: string): Promise<number> {
  const normalized = token.toUpperCase();
  if (normalized === 'USDC' || normalized === 'USDT') {
    return 1;
  }
  const binancePrice = await fetchBinancePrice(normalized);
  return Number(binancePrice);
}

router.post('/', async (req, res) => {
  const src = String(req.body?.src ?? '').toUpperCase();
  const dst = String(req.body?.dst ?? '').toUpperCase();
  const amountRaw = String(req.body?.amount ?? '');

  if (!src || !dst || !amountRaw) {
    res.status(400).json(errorResponse('src, dst, and amount are required'));
    return;
  }

  const amount = Number(amountRaw);
  if (!Number.isFinite(amount) || amount <= 0) {
    res.status(400).json(errorResponse('amount must be a positive number'));
    return;
  }

  try {
    const srcUsd = await priceInUsd(src);
    const dstUsd = await priceInUsd(dst);
    const executionPrice = srcUsd / dstUsd;

    const toAmount = amount * executionPrice * 0.997;
    const minOutputAmount = toAmount * 0.99;
    const txData = `0x${randomBytes(32).toString('hex')}`;

    res.json(
      success({
        fromToken: src,
        toToken: dst,
        fromAmount: amountRaw,
        toAmount: toAmount.toFixed(6),
        outputAmount: toAmount.toFixed(6),
        minOutputAmount: minOutputAmount.toFixed(6),
        route: [{ protocol: 'Uniswap V3', percent: 100 }],
        steps: ['price-quote', 'route-selection', 'tx-build'],
        unsignedTx: {
          to: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
          data: txData,
          value: '0',
          gasLimit: '250000',
          chainId: 8453
        },
        swap: {
          to: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
          data: txData,
          value: '0',
          chainId: 8453
        },
        srcToken: src,
        dstToken: dst,
        amount: amountRaw,
        network: 'base',
        router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
        note: 'Mock swap route and unsigned transaction.',
        timestamp: new Date().toISOString(),
        priceImpact: '0.1%',
        executionPrice: executionPrice.toFixed(6)
      })
    );
  } catch {
    res.status(502).json(errorResponse(`unable to price trade pair: ${src}/${dst}`));
  }
});

export default router;
