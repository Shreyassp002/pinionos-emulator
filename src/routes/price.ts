import { Router } from 'express';
import { fetchBinancePrice } from '../freeApis/binance';
import { fetchCoinGeckoPrice } from '../freeApis/coingecko';
import { getPriceRule } from '../config';
import { errorResponse, success } from '../types';

const router = Router();
const staticFallback: Record<string, string> = {
  ETH: '3000.00',
  BTC: '90000.00',
  SOL: '180.00',
  MATIC: '1.10',
  USDC: '1.00'
};

router.get('/:token', async (req, res) => {
  const token = String(req.params.token || '').toUpperCase();
  if (!token) {
    res.status(400).json(errorResponse('token is required'));
    return;
  }

  const priceRule = getPriceRule(token);
  if (priceRule.mode === 'override' && typeof priceRule.value === 'number') {
    res.json(success({ token, usd: priceRule.value.toFixed(2), source: 'config' }));
    return;
  }

  try {
    const usd = await fetchCoinGeckoPrice(token);
    res.json(success({ token, usd, source: 'coingecko' }));
    return;
  } catch {
    // fall through to binance
  }

  try {
    const usd = await fetchBinancePrice(token);
    res.json(success({ token, usd, source: 'binance' }));
    return;
  } catch {
    // fall through to final static fallback
  }

  if (staticFallback[token]) {
    res.json(success({ token, usd: staticFallback[token], source: 'fallback' }));
    return;
  }

  res.status(502).json(errorResponse(`price unavailable for token: ${token}`));
});

export default router;
