import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { fetchBinancePrice } from '../freeApis/binance';
import { fetchCoinGeckoPrice } from '../freeApis/coingecko';
import { getNetworkInfo, getPriceRule, getFallbackPrice } from '../config';
import { deduct, credit, getBalances } from '../state/balances';
import { errorResponse, success } from '../types';
import type { Dashboard } from '../ui/dashboard';

const DEFAULT_SENDER = 'default';

async function priceInUsd(token: string): Promise<number> {
  const normalized = token.toUpperCase();
  if (normalized === 'USDC' || normalized === 'USDT' || normalized === 'DAI') {
    return 1;
  }

  // Use same price resolution order as /price route: config → CoinGecko → Binance → fallback
  const rule = getPriceRule(normalized);
  if (rule.mode === 'override' && typeof rule.value === 'number') {
    return rule.value;
  }

  const providerOrder: Array<'coingecko' | 'binance'> =
    rule.mode === 'api' && rule.provider
      ? [rule.provider, rule.provider === 'coingecko' ? 'binance' : 'coingecko']
      : ['coingecko', 'binance'];

  for (const provider of providerOrder) {
    try {
      if (provider === 'coingecko') {
        return Number(await fetchCoinGeckoPrice(normalized));
      }
      return Number(await fetchBinancePrice(normalized));
    } catch {
      // Try the next provider in the configured order.
    }
  }

  const fallback = getFallbackPrice(normalized);
  if (fallback !== null) {
    return fallback;
  }

  throw new Error(`Cannot determine price for token: ${normalized}`);
}

export function createTradeRouter(dashboard?: Dashboard): Router {
const router = Router();

router.post('/', async (req, res) => {
  const src = String(req.body?.src ?? '').toUpperCase();
  const dst = String(req.body?.dst ?? '').toUpperCase();
  const amountRaw = String(req.body?.amount ?? '');
  const slippage = Number(req.body?.slippage ?? 1);
  const from = typeof req.body?.from === 'string' ? req.body.from : undefined;

  if (!src || !dst || !amountRaw) {
    res.status(400).json(errorResponse('src, dst, and amount are required'));
    return;
  }

  if (src === dst) {
    res.status(400).json(errorResponse(`src and dst must be different tokens (got ${src} for both)`));
    return;
  }

  const amount = Number(amountRaw);
  if (!Number.isFinite(amount) || amount <= 0) {
    res.status(400).json(errorResponse('amount must be a positive number'));
    return;
  }

  if (!Number.isFinite(slippage) || slippage < 0.01 || slippage > 50) {
    res.status(400).json(errorResponse('slippage must be between 0.01 and 50 (percent)'));
    return;
  }
  const slippagePct = slippage;

  try {
    const srcUsd = await priceInUsd(src);
    const dstUsd = await priceInUsd(dst);
    const executionPrice = srcUsd / dstUsd;

    // Apply 0.3% Uniswap V3 fee
    const toAmount = amount * executionPrice * 0.997;
    // Apply slippage tolerance
    const minOutputAmount = toAmount * (1 - slippagePct / 100);
    // Mutate balances: deduct src, credit dst
    const sender = from ?? DEFAULT_SENDER;
    if (!deduct(sender, src, amount)) {
      res.status(400).json(errorResponse(`insufficient ${src} balance`));
      return;
    }
    credit(sender, dst, toAmount);

    // Update dashboard wallet panel with new balances
    if (dashboard) {
      const bal = getBalances(sender);
      dashboard.setWalletInfo({ eth: bal.ETH ?? '0', usdc: bal.USDC ?? '0' });
    }

    const net = getNetworkInfo();
    const txData = `0x${randomBytes(32).toString('hex')}`;
    const routerAddr = '0xE592427A0AEce92De3Edee1F18E0157C05861564';

    const swapTx = {
      to: routerAddr,
      data: txData,
      value: '0',
      chainId: net.chainId
    };

    res.json(
      success({
        swap: swapTx,
        srcToken: src,
        dstToken: dst,
        amount: amountRaw,
        network: net.name,
        router: routerAddr,
        note: 'Mock swap route via Uniswap V3 on Base. Sign and broadcast the swap tx.',
        timestamp: new Date().toISOString(),
        // Extended fields (not in SDK type but helpful for debugging)
        from: from ?? null,
        toAmount: toAmount.toFixed(6),
        minOutputAmount: minOutputAmount.toFixed(6),
        executionPrice: executionPrice.toFixed(6),
      })
    );
  } catch (err) {
    res.status(502).json(errorResponse(`unable to price trade pair: ${src}/${dst} — ${(err as Error).message}`));
  }
});

return router;
}

export default createTradeRouter();
