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
    const usd = priceRule.value.toFixed(2);
    res.json(
      success({
        token,
        usd,
        source: 'config',
        network: 'base',
        priceUSD: Number(usd),
        change24h: null,
        timestamp: new Date().toISOString()
      })
    );
    return;
  }

  try {
    const usd = await fetchCoinGeckoPrice(token);
    res.json(
      success({
        token,
        usd,
        source: 'coingecko',
        network: 'base',
        priceUSD: Number(usd),
        change24h: null,
        timestamp: new Date().toISOString()
      })
    );
    return;
  } catch {
    // fall through to binance
  }

  try {
    const usd = await fetchBinancePrice(token);
    res.json(
      success({
        token,
        usd,
        source: 'binance',
        network: 'base',
        priceUSD: Number(usd),
        change24h: null,
        timestamp: new Date().toISOString()
      })
    );
    return;
  } catch {
    // fall through to final static fallback
  }

  const fallbackPrice = getFallbackPrice(token);
  if (fallbackPrice !== null) {
    const usd = fallbackPrice.toFixed(2);
    res.json(
      success({
        token,
        usd,
        source: 'config-fallback',
        network: 'base',
        priceUSD: Number(usd),
        change24h: null,
        timestamp: new Date().toISOString()
      })
    );
    return;
  }

  res.status(502).json(errorResponse(`price unavailable for token: ${token}`));
});

export default router;
