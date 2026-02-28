import { loadConfig } from '../config';

/**
 * In-memory mutable balance store.
 * Initialized from config.json on startup.
 * Send/trade/fund mutate balances; reset restores defaults.
 */

// Balances stored as plain numbers for simplicity.
// Map<address, Map<TOKEN, number>>
const store = new Map<string, Map<string, number>>();

// The "default" address key from config — used when no specific address is matched.
const DEFAULT_KEY = 'default';

/** Load initial balances from config.json into the store. */
export function initBalances(): void {
  store.clear();
  const config = loadConfig();
  for (const [addr, bal] of Object.entries(config.balances)) {
    const tokens = new Map<string, number>();
    for (const [token, value] of Object.entries(bal)) {
      tokens.set(token.toUpperCase(), Number(value) || 0);
    }
    store.set(addr, tokens);
  }
}

/** Get a mutable token map for an address (falls back to cloning defaults). */
function getOrCreate(address: string): Map<string, number> {
  let entry = store.get(address);
  if (entry) return entry;

  // Clone defaults for new addresses
  const defaults = store.get(DEFAULT_KEY);
  entry = new Map(defaults ?? []);
  store.set(address, entry);
  return entry;
}

// Display decimals per token
const TOKEN_DISPLAY_DECIMALS: Record<string, number> = {
  USDC: 2, USDT: 2, DAI: 2,
  WBTC: 8,
  ETH: 6, WETH: 6, CBETH: 6, SOL: 6,
};

function formatBalance(token: string, amount: number): string {
  const decimals = TOKEN_DISPLAY_DECIMALS[token] ?? 6;
  return amount.toFixed(decimals).replace(/\.?0+$/, '') || '0';
}

/** Get all balances for an address. */
export function getBalances(address: string): Record<string, string> {
  const entry = getOrCreate(address);
  const result: Record<string, string> = {};
  for (const [token, amount] of entry) {
    result[token] = formatBalance(token, amount);
  }
  return result;
}

/** Get balance for a specific token. Returns 0 if not set. */
export function getBalance(address: string, token: string): number {
  const entry = getOrCreate(address);
  return entry.get(token.toUpperCase()) ?? 0;
}

/**
 * Deduct an amount from an address's balance.
 * Returns true if sufficient balance, false if insufficient.
 */
export function deduct(address: string, token: string, amount: number): boolean {
  const t = token.toUpperCase();
  const entry = getOrCreate(address);
  const current = entry.get(t) ?? 0;
  if (current < amount) return false;
  entry.set(t, current - amount);
  return true;
}

/** Credit an amount to an address's balance. */
export function credit(address: string, token: string, amount: number): void {
  const t = token.toUpperCase();
  const entry = getOrCreate(address);
  const current = entry.get(t) ?? 0;
  entry.set(t, current + amount);
}

/** Reset all balances back to config.json defaults. */
export function resetBalances(): void {
  initBalances();
}
