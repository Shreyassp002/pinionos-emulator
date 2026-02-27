import axios from 'axios';

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { price: string; timestamp: number }>();

const pairMap: Record<string, string> = {
  ETH: 'ETHUSDT',
  BTC: 'BTCUSDT',
  SOL: 'SOLUSDT',
  MATIC: 'MATICUSDT',
  USDC: 'USDCUSDT'
};

interface BinanceTicker {
  symbol: string;
  price: string;
}

export async function fetchBinancePrice(token: string): Promise<string> {
  const normalized = token.toUpperCase();
  const cached = cache.get(normalized);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.price;
  }

  const pair = pairMap[normalized];
  if (!pair) {
    throw new Error(`Binance mapping not found for token: ${normalized}`);
  }

  const url = `https://api.binance.com/api/v3/ticker/price?symbol=${pair}`;
  const response = await axios.get<BinanceTicker>(url, { timeout: 5_000 });

  const rawPrice = response.data?.price;
  if (!rawPrice) {
    throw new Error(`Binance missing price for token: ${normalized}`);
  }

  const price = Number(rawPrice).toFixed(2);
  cache.set(normalized, { price, timestamp: Date.now() });
  return price;
}
