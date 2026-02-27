import axios from 'axios';

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { price: string; timestamp: number }>();

const geckoMap: Record<string, string | null> = {
  ETH: 'ethereum',
  BTC: 'bitcoin',
  SOL: 'solana',
  MATIC: 'matic-network',
  USDC: null
};

export async function fetchCoinGeckoPrice(token: string): Promise<string> {
  const normalized = token.toUpperCase();

  if (normalized === 'USDC') {
    return '1.00';
  }

  const cached = cache.get(normalized);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.price;
  }

  const geckoId = geckoMap[normalized];
  if (!geckoId) {
    throw new Error(`CoinGecko mapping not found for token: ${normalized}`);
  }

  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${geckoId}&vs_currencies=usd`;
  const response = await axios.get<Record<string, { usd: number }>>(url, { timeout: 5_000 });
  const usd = response.data?.[geckoId]?.usd;

  if (typeof usd !== 'number') {
    throw new Error(`CoinGecko missing usd price for token: ${normalized}`);
  }

  const price = usd.toFixed(2);
  cache.set(normalized, { price, timestamp: Date.now() });
  return price;
}
