import { Router } from 'express';
import { fetchBinancePrice } from '../freeApis/binance';
import { fetchCoinGeckoPriceWithChange } from '../freeApis/coingecko';
import { getFallbackPrice, getNetworkInfo, getPriceRule } from '../config';
import type { Dashboard } from '../ui/dashboard';
import { errorResponse, success } from '../types';

export function createPriceRouter(dashboard?: Dashboard): Router {
  const router = Router();

  router.get('/:token', async (req, res) => {
    const token = String(req.params.token || '').toUpperCase();
    if (!token) {
      res.status(400).json(errorResponse('token is required'));
      return;
    }

    const net = getNetworkInfo();

    const priceRule = getPriceRule(token);
    if (priceRule.mode === 'override' && typeof priceRule.value === 'number') {
      const usd = priceRule.value.toFixed(2);
      res.json(
        success({
          token,
          network: net.name,
          priceUSD: Number(usd),
          change24h: null,
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    const providerOrder: Array<'coingecko' | 'binance'> =
      priceRule.mode === 'api' && priceRule.provider
        ? [priceRule.provider, priceRule.provider === 'coingecko' ? 'binance' : 'coingecko']
        : ['coingecko', 'binance'];

    for (const provider of providerOrder) {
      try {
        if (provider === 'coingecko') {
          const { price, change24h } = await fetchCoinGeckoPriceWithChange(token);
          if (dashboard) {
            dashboard.updatePrices({ [token]: price });
          }
          res.json(
            success({
              token,
              network: net.name,
              priceUSD: Number(price),
              change24h: change24h !== null ? `${change24h > 0 ? '+' : ''}${change24h.toFixed(2)}%` : null,
              timestamp: new Date().toISOString()
            })
          );
          return;
        }

        const usd = await fetchBinancePrice(token);
        res.json(
          success({
            token,
            network: net.name,
            priceUSD: Number(usd),
            change24h: null,
            timestamp: new Date().toISOString()
          })
        );
        return;
      } catch {
        // Try next provider in the configured order.
      }
    }

    const fallbackPrice = getFallbackPrice(token);
    if (fallbackPrice !== null) {
      const usd = fallbackPrice.toFixed(2);
      res.json(
        success({
          token,
          network: net.name,
          priceUSD: Number(usd),
          change24h: null,
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    res.status(404).json(errorResponse(`no price data available for token: ${token}`));
  });

  return router;
}

export default createPriceRouter();
