import { Router } from 'express';
import { fetchBinancePrice } from '../freeApis/binance';
import { fetchCoinGeckoPrice } from '../freeApis/coingecko';
import { getFallbackPrice, getPriceRule } from '../config';
import { errorResponse, success } from '../types';

const router = Router();

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

  const fallbackPrice = getFallbackPrice(token);
  if (fallbackPrice !== null) {
    res.json(success({ token, usd: fallbackPrice.toFixed(2), source: 'config-fallback' }));
    return;
  }

  res.status(502).json(errorResponse(`price unavailable for token: ${token}`));
});

export default router;
