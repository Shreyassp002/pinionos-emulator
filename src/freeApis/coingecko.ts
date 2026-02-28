import axios from 'axios';

const DEFAULT_CACHE_TTL_MS = 60_000;
const EXTENDED_CACHE_TTL_MS = 120_000;
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 1_000;

interface CacheEntry {
  price: string;
  change24h: number | null;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();

// Track consecutive failures to extend cache TTL
let consecutiveFailures = 0;

function cacheTtl(): number {
  return consecutiveFailures >= 2 ? EXTENDED_CACHE_TTL_MS : DEFAULT_CACHE_TTL_MS;
}

export const geckoMap: Record<string, string | null> = {
  ETH: 'ethereum',
  BTC: 'bitcoin',
  SOL: 'solana',
  MATIC: 'matic-network',
  USDC: null
};

async function fetchWithRetry<T>(url: string, timeout: number): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await axios.get<T>(url, { timeout });
      consecutiveFailures = 0;
      return response.data;
    } catch (err: unknown) {
      lastError = err as Error;
      const status = (err as { response?: { status?: number } })?.response?.status;

      if (status === 429) {
        // Rate limited — exponential backoff
        const delay = BASE_BACKOFF_MS * Math.pow(2, attempt);
        console.warn(`[CoinGecko] Rate limited (429). Retrying in ${delay}ms... (attempt ${attempt + 1}/${MAX_RETRIES})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // Non-retryable error
      break;
    }
  }

  consecutiveFailures += 1;
  throw lastError ?? new Error('CoinGecko request failed');
}

export async function fetchCoinGeckoPriceWithChange(token: string): Promise<{ price: string; change24h: number | null }> {
  const normalized = token.toUpperCase();

  if (normalized === 'USDC') {
    return { price: '1.00', change24h: 0 };
  }

  const cached = cache.get(normalized);
  if (cached && Date.now() - cached.timestamp < cacheTtl()) {
    return { price: cached.price, change24h: cached.change24h };
  }

  const geckoId = geckoMap[normalized];
  if (!geckoId) {
    throw new Error(`CoinGecko mapping not found for token: ${normalized}`);
  }

  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${geckoId}&vs_currencies=usd&include_24hr_change=true`;
  const data = await fetchWithRetry<Record<string, { usd: number; usd_24h_change?: number }>>(url, 5_000);
  const row = data?.[geckoId];

  if (typeof row?.usd !== 'number') {
    throw new Error(`CoinGecko missing usd price for token: ${normalized}`);
  }

  const price = row.usd.toFixed(2);
  const change24h = typeof row.usd_24h_change === 'number' ? row.usd_24h_change : null;
  cache.set(normalized, { price, change24h, timestamp: Date.now() });
  return { price, change24h };
}

export async function fetchCoinGeckoPrice(token: string): Promise<string> {
  const { price } = await fetchCoinGeckoPriceWithChange(token);
  return price;
}

/**
 * Fetch multiple token prices in a single API call — used by the dashboard
 * to reduce CoinGecko rate limit usage.
 */
export async function fetchCoinGeckoBatch(
  tokens: string[]
): Promise<Record<string, { price: string; change24h: number | null }>> {
  const normalized = tokens.map((t) => t.toUpperCase());

  // Populate from cache first
  const result: Record<string, { price: string; change24h: number | null }> = {};
  const needFetch: string[] = [];
  const ttl = cacheTtl();

  for (const token of normalized) {
    if (token === 'USDC') {
      result[token] = { price: '1.00', change24h: 0 };
      continue;
    }
    const cached = cache.get(token);
    if (cached && Date.now() - cached.timestamp < ttl) {
      result[token] = { price: cached.price, change24h: cached.change24h };
    } else {
      needFetch.push(token);
    }
  }

  if (needFetch.length === 0) {
    return result;
  }

  const ids = needFetch
    .map((t) => geckoMap[t])
    .filter((id): id is string => id !== null && id !== undefined)
    .join(',');

  if (!ids) {
    return result;
  }

  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;
  const data = await fetchWithRetry<Record<string, { usd: number; usd_24h_change?: number }>>(url, 8_000);

  for (const token of needFetch) {
    const geckoId = geckoMap[token];
    if (!geckoId) continue;
    const row = data?.[geckoId];
    if (typeof row?.usd !== 'number') continue;
    const price = row.usd.toFixed(2);
    const change24h = typeof row.usd_24h_change === 'number' ? row.usd_24h_change : null;
    cache.set(token, { price, change24h, timestamp: Date.now() });
    result[token] = { price, change24h };
  }

  return result;
}
