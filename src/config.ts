import fs from 'node:fs';
import path from 'node:path';

export interface AddressBalance {
  ETH: string;
  USDC: string;
}

export interface ErrorSimulationRule {
  route: string;
  errorRate: number;
  statusCode: number;
  message: string;
}

export interface ErrorSimulationConfig {
  enabled: boolean;
  rules: ErrorSimulationRule[];
}

export interface Config {
  port: number;
  mockPayments: boolean;
  network?: 'base' | 'base-sepolia';
  prices: Record<string, number | string>;
  fallbackPrices?: Record<string, number | string>;
  balances: Record<string, AddressBalance>;
  x402Mode?: boolean;
  x402PayTo?: string;
  x402Price?: string;
  recording?: boolean;
  errorSimulation?: ErrorSimulationConfig;
  chatProxy?: string;
}

/** Network constants derived from config.network */
export interface NetworkInfo {
  name: string;
  chainId: number;
  explorer: string;
  rpcUrl: string;
  usdcAddress: string;
}

const NETWORKS: Record<string, NetworkInfo> = {
  base: {
    name: 'base',
    chainId: 8453,
    explorer: 'https://basescan.org',
    rpcUrl: 'https://mainnet.base.org',
    usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  },
  'base-sepolia': {
    name: 'base-sepolia',
    chainId: 84532,
    explorer: 'https://sepolia.basescan.org',
    rpcUrl: 'https://sepolia.base.org',
    usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  },
};

export function getNetworkInfo(): NetworkInfo {
  const config = loadConfig();
  return NETWORKS[config.network ?? 'base'] ?? NETWORKS.base;
}

export interface PriceRule {
  mode: 'override' | 'api' | 'unset';
  provider?: 'coingecko' | 'binance';
  value?: number;
}

const DEFAULT_CONFIG: Config = {
  port: 4020,
  mockPayments: true,
  prices: {
    ETH: 'useApi:coingecko',
    BTC: 'useApi:coingecko',
    SOL: 'useApi:coingecko',
    USDC: 1,
  },
  fallbackPrices: {
    ETH: 3000,
    BTC: 90000,
    SOL: 180,
    USDC: 1,
  },
  balances: {
    default: { ETH: '1.5', USDC: '250.00' },
  },
};

let configPath = path.resolve(process.cwd(), 'config.json');
let cachedConfig: Config | null = null;
let cliOverrides: Partial<Config> = {};

/** Set the path to config.json (call before loadConfig) */
export function setConfigPath(p: string): void {
  configPath = path.resolve(p);
  cachedConfig = null;
}

/** Set CLI overrides that take precedence over config.json values */
export function setCliOverrides(overrides: Partial<Config>): void {
  cliOverrides = overrides;
  cachedConfig = null;
}

export function loadConfig(): Config {
  if (cachedConfig) {
    return cachedConfig;
  }

  let cfg: Config;

  let raw: string | null = null;
  try {
    raw = fs.readFileSync(configPath, 'utf-8');
  } catch {
    // No config file — use defaults
  }

  if (raw !== null) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(`[PinionOS Emulator] config.json is not valid JSON: ${configPath}`);
    }

    cfg = parsed as Config;

    if (typeof cfg.port !== 'number') {
      throw new Error('[PinionOS Emulator] config.json must include a numeric "port" field');
    }
    if (!cfg.balances || typeof cfg.balances !== 'object') {
      throw new Error('[PinionOS Emulator] config.json must include a "balances" object');
    }
    if (!cfg.balances.default) {
      throw new Error('[PinionOS Emulator] config.json "balances" must include a "default" entry');
    }
  } else {
    console.log('[PinionOS Emulator] No config.json found, using defaults. Run `pinionos-emulator init` to create one.');
    cfg = { ...DEFAULT_CONFIG, balances: { ...DEFAULT_CONFIG.balances } };
  }

  // Apply CLI overrides
  if (cliOverrides.port !== undefined) cfg.port = cliOverrides.port;
  if (cliOverrides.x402Mode !== undefined) cfg.x402Mode = cliOverrides.x402Mode;
  if (cliOverrides.network !== undefined) cfg.network = cliOverrides.network;

  cachedConfig = cfg;
  return cachedConfig;
}

/** Returns the default config object (for `init` command) */
export function getDefaultConfig(): Config {
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}

/** Force reload config from disk (useful after editing config.json at runtime) */
export function reloadConfig(): Config {
  cachedConfig = null;
  return loadConfig();
}

export function getPriceRule(token: string): PriceRule {
  const config = loadConfig();
  const value = config.prices[token.toUpperCase()];

  if (typeof value === 'number') {
    return { mode: 'override', value };
  }

  if (typeof value === 'string' && /^\d+(\.\d+)?$/.test(value)) {
    return { mode: 'override', value: Number(value) };
  }

  if (typeof value === 'string' && value.toLowerCase() === 'useapi:coingecko') {
    return { mode: 'api', provider: 'coingecko' };
  }

  if (typeof value === 'string' && value.toLowerCase() === 'useapi:binance') {
    return { mode: 'api', provider: 'binance' };
  }

  return { mode: 'unset' };
}

export function getFallbackPrice(token: string): number | null {
  const config = loadConfig();
  const value = config.fallbackPrices?.[token.toUpperCase()];

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string' && /^\d+(\.\d+)?$/.test(value)) {
    return Number(value);
  }

  return null;
}
