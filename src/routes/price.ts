import { Router } from 'express';
import { fetchBinancePrice } from '../freeApis/binance';
import { fetchCoinGeckoPrice } from '../freeApis/coingecko';
import { getConfigPrice } from '../config';
import { errorResponse, success } from '../types';

const router = Router();

router.get('/:token', async (req, res) => {
  const token = String(req.params.token || '').toUpperCase();
  if (!token) {
    res.status(400).json(errorResponse('token is required'));
    return;
  }

  const staticPrice = getConfigPrice(token);
  if (staticPrice !== null) {
    res.json(success({ token, usd: staticPrice.toFixed(2), source: 'config' }));
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

  if (staticPrice !== null) {
    res.json(success({ token, usd: staticPrice.toFixed(2), source: 'config' }));
    return;
  }

  res.status(502).json(errorResponse(`price unavailable for token: ${token}`));
});

export default router;
