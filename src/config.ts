import fs from 'node:fs';
import path from 'node:path';

export interface AddressBalance {
  ETH: string;
  USDC: string;
}

export interface Config {
  port: number;
  mockPayments: boolean;
  prices: Record<string, number | string>;
  balances: Record<string, AddressBalance>;
}

const CONFIG_PATH = path.resolve(process.cwd(), 'config.json');

let cachedConfig: Config | null = null;

export function loadConfig(): Config {
  if (cachedConfig) {
    return cachedConfig;
  }

  const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
  cachedConfig = JSON.parse(raw) as Config;
  return cachedConfig;
}

export function getConfigPrice(token: string): number | null {
  const config = loadConfig();
  const value = config.prices[token.toUpperCase()];

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string' && /^\d+(\.\d+)?$/.test(value)) {
    return Number(value);
  }

  return null;
}
