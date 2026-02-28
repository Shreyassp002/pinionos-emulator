import { loadConfig, getNetworkInfo } from '../config';
import { fetchCoinGeckoBatch } from '../freeApis/coingecko';
import { buildHeaderText, printHeader } from './panels/header';
import { renderFeed, type FeedEntry } from './panels/feed';
import { renderInspector, type InspectorState } from './panels/inspector';
import { renderPrices, type PriceEntry } from './panels/prices';
import { renderWallet, type WalletPanelState } from './panels/wallet';

export interface SkillLogMeta {
  method?: string;
  path?: string;
  body?: unknown;
  response?: unknown;
  statusCode?: number;
}

export interface Dashboard {
  logSkillCall(skill: string, param: string, result: string, meta?: SkillLogMeta): void;
  updatePrices(prices: Record<string, string>): void;
  logError(message: string): void;
  setWalletInfo(info: Partial<WalletPanelState>): void;
  destroy(): void;
}

interface ScreenWidgets {
  screen: {
    render: () => void;
    destroy: () => void;
    key: (keys: string[], cb: () => void) => void;
    on: (event: string, cb: () => void) => void;
  };
  header: { setContent: (content: string) => void };
  prices: { setContent: (content: string) => void };
  wallet: { setContent: (content: string) => void };
  feed: { setContent: (content: string) => void; setScrollPerc: (p: number) => void };
  inspector: { setContent: (content: string) => void };
}

interface BlessedScreen {
  render: () => void;
  destroy: () => void;
  key: (keys: string[], cb: () => void) => void;
  on: (event: string, cb: () => void) => void;
}

interface BlessedModule {
  screen: (opts: { smartCSR: boolean; title: string; fullUnicode?: boolean }) => BlessedScreen;
  box: unknown;
}

interface GridLayout {
  set: (
    row: number,
    col: number,
    rowSpan: number,
    colSpan: number,
    widget: unknown,
    opts: Record<string, unknown>
  ) => unknown;
}

interface ContribModule {
  grid: new (opts: { rows: number; cols: number; screen: BlessedScreen; hideBorder?: boolean }) => GridLayout;
}

function asContentWidget(value: unknown): { setContent: (content: string) => void } {
  return value as { setContent: (content: string) => void };
}

function asFeedWidget(value: unknown): { setContent: (content: string) => void; setScrollPerc: (p: number) => void } {
  return value as { setContent: (content: string) => void; setScrollPerc: (p: number) => void };
}

let activeDashboard: Dashboard | null = null;
const NON_BILLABLE_SKILLS = new Set(['SYSTEM', 'ERROR', 'x402', 'x-api-key', 'CHAOS', 'facilitator', 'x402-svc']);

function baseSkillName(skillLabel: string): string {
  const idx = skillLabel.indexOf('(');
  return idx >= 0 ? skillLabel.slice(0, idx) : skillLabel;
}

function isBillableSkill(skillLabel: string): boolean {
  return !NON_BILLABLE_SKILLS.has(baseSkillName(skillLabel));
}

function nowTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(
    d.getSeconds()
  ).padStart(2, '0')}`;
}

function uptime(start: number): string {
  const s = Math.max(0, Math.floor((Date.now() - start) / 1000));
  const hh = String(Math.floor(s / 3600)).padStart(2, '0');
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function firstConfiguredAddress(): string {
  const config = loadConfig();
  const keys = Object.keys(config.balances).filter((k) => k !== 'default');
  return keys[0] ?? '0x0000000000000000000000000000000000000000';
}

function createFallbackDashboard(port: number): Dashboard {
  printHeader(port);

  return {
    logSkillCall(skill, param, result, meta) {
      const label = param ? `${skill}(${param})` : skill;
      const method = meta?.method ?? '';
      const status = meta?.statusCode ? ` [${meta.statusCode}]` : '';
      // eslint-disable-next-line no-console
      console.log(`[${nowTime()}] ${method} ${label}${status} -> ${result}`);
    },
    updatePrices(prices) {
      const parts = Object.entries(prices)
        .map(([t, p]) => `${t}=$${p}`)
        .join(' ');
      // eslint-disable-next-line no-console
      console.log(`[PRICES] ${parts}`);
    },
    logError(message) {
      // eslint-disable-next-line no-console
      console.error(`[ERROR] ${message}`);
    },
    setWalletInfo() {
      // no-op in fallback mode
    },
    destroy() {
      // nothing to clean up in console mode
    }
  };
}

function summarizeResponseFallback(meta?: SkillLogMeta): string {
  if (!meta?.response || typeof meta.response !== 'object') {
    return 'ok';
  }

  const body = meta.response as Record<string, unknown>;
  const data = (body.data as Record<string, unknown> | undefined) ?? body;

  if (typeof data.usd === 'string') {
    return `$${data.usd}`;
  }
  if (typeof data.priceUSD === 'number') {
    return `$${data.priceUSD}`;
  }
  if (typeof data.ETH === 'string') {
    return `${data.ETH} ETH`;
  }
  if (typeof data.toAmount === 'string') {
    return `${data.toAmount} ${String(data.toToken ?? data.dstToken ?? '')}`.trim();
  }
  if (typeof data.address === 'string') {
    return String(data.address).slice(0, 14) + '...';
  }
  if (typeof data.reply === 'string' || typeof data.response === 'string') {
    return 'mock reply';
  }
  if (typeof data.txHash === 'string' || typeof data.hash === 'string') {
    const h = String(data.txHash ?? data.hash);
    return `${h.slice(0, 10)}...`;
  }
  return 'ok';
}

function buildDashboard(port: number): Dashboard {
  let widgets: ScreenWidgets | null = null;
  let pollTimer: NodeJS.Timeout | null = null;
  const startTs = Date.now();
  let totalCalls = 0;
  let billableCalls = 0;
  let errorCount = 0;
  let x402Payments = 0;
  const feedEntries: FeedEntry[] = [];

  const walletState: WalletPanelState = {
    eth: loadConfig().balances.default?.ETH ?? '1.5',
    usdc: loadConfig().balances.default?.USDC ?? '250.00',
    keysIssued: 0,
    address: firstConfiguredAddress(),
    network: getNetworkInfo().name,
    chainId: getNetworkInfo().chainId
  };

  let lastInspector: InspectorState = {
    method: '-',
    path: '-',
    statusCode: undefined,
    body: {},
    response: {}
  };

  let priceEntries: PriceEntry[] = [
    { token: 'ETH', usd: 'Fetching...', change24h: null },
    { token: 'BTC', usd: 'Fetching...', change24h: null },
    { token: 'SOL', usd: 'Fetching...', change24h: null },
    { token: 'USDC', usd: '1.00', change24h: 0 }
  ];
  let priceSource = 'Boot';
  let priceUpdatedAt = Date.now();

  function rerender(): void {
    if (!widgets) {
      return;
    }

    const cfg = loadConfig();
    const netInfo = getNetworkInfo();
    widgets.header.setContent(buildHeaderText(port, totalCalls, errorCount, uptime(startTs), x402Payments, {
      network: netInfo.name, chainId: netInfo.chainId, x402Mode: cfg.x402Mode, recording: cfg.recording
    }));
    widgets.prices.setContent(renderPrices(priceEntries, priceSource, Math.floor((Date.now() - priceUpdatedAt) / 1000)));
    widgets.wallet.setContent(renderWallet(walletState));
    widgets.feed.setContent(renderFeed(feedEntries.slice(-20), totalCalls, billableCalls * 0.01, uptime(startTs)));
    widgets.feed.setScrollPerc(100);
    widgets.inspector.setContent(renderInspector(lastInspector));
    widgets.screen.render();
  }

  // Single batch CoinGecko fetch — uses same cache as route handlers (no duplicate requests)
  async function refreshPrices(): Promise<void> {
    try {
      const data = await fetchCoinGeckoBatch(['ETH', 'BTC', 'SOL', 'USDC']);
      const updated: PriceEntry[] = ['ETH', 'BTC', 'SOL', 'USDC'].map((token) => {
        const entry = data[token];
        return entry
          ? { token, usd: entry.price, change24h: entry.change24h }
          : { token, usd: token === 'USDC' ? '1.00' : '—', change24h: null };
      });
      priceEntries = updated;
      priceSource = 'CoinGecko';
      priceUpdatedAt = Date.now();
      rerender();
    } catch {
      // keep old values on failure
    }
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const blessed = require('blessed') as BlessedModule;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const contrib = require('blessed-contrib') as ContribModule;

    const screen = blessed.screen({ smartCSR: true, title: 'PinionOS Emulator', fullUnicode: true });
    const grid = new contrib.grid({ rows: 24, cols: 12, screen, hideBorder: true });

    const header = asContentWidget(
      grid.set(0, 0, 8, 12, blessed.box, {
        tags: true,
        align: 'center',
        valign: 'middle',
        wrap: false,
        style: { fg: 'cyan' }
      })
    );

    const prices = asContentWidget(
      grid.set(8, 0, 5, 5, blessed.box, {
        border: { type: 'line' },
        style: { border: { fg: 'green' } },
        label: ' LIVE PRICES '
      })
    );

    const wallet = asContentWidget(
      grid.set(8, 5, 5, 7, blessed.box, {
        border: { type: 'line' },
        style: { border: { fg: 'yellow' } },
        label: ' MOCK WALLET '
      })
    );

    const feed = asFeedWidget(
      grid.set(13, 0, 7, 12, blessed.box, {
        border: { type: 'line' },
        style: { border: { fg: 'cyan' } },
        label: ' SKILL CALL FEED ',
        scrollable: true,
        alwaysScroll: true,
        keys: true,
        vi: true
      })
    );

    const inspector = asContentWidget(
      grid.set(20, 0, 4, 12, blessed.box, {
        border: { type: 'line' },
        style: { border: { fg: 'magenta' } },
        label: ' LAST REQUEST / RESPONSE ',
        scrollable: true,
        alwaysScroll: true,
        keys: true,
        vi: true
      })
    );

    widgets = { screen, header, prices, wallet, feed, inspector };

    screen.key(['q', 'C-c'], () => {
      if (pollTimer) {
        clearInterval(pollTimer);
      }
      screen.destroy();
      process.exit(0);
    });

    screen.on('resize', () => rerender());

    rerender();
    void refreshPrices();
    // Poll every 30s — within CoinGecko free tier (30 req/min); cache ensures route hits don't add extra requests
    pollTimer = setInterval(() => {
      void refreshPrices();
    }, 30_000);
  } catch {
    return createFallbackDashboard(port);
  }

  return {
    logSkillCall(skill, param, result, meta) {
      totalCalls += 1;

      const statusCode = meta?.statusCode;
      const isError = statusCode !== undefined && statusCode >= 400;
      if (isError) {
        errorCount += 1;
      }

      // Track x402 payment acceptances
      if (skill === 'x402' && result.startsWith('payment accepted')) {
        x402Payments += 1;
      }

      if (skill.toLowerCase() === 'unlimited' && meta?.response && typeof meta.response === 'object') {
        const data = ((meta.response as Record<string, unknown>).data ?? meta.response) as Record<string, unknown>;
        if (typeof data.key === 'string' || typeof data.apiKey === 'string') {
          walletState.keysIssued += 1;
        }
      }

      const method = meta?.method ?? '';
      const label = param ? `${skill}(${param})` : skill;
      const displayResult = result || summarizeResponseFallback(meta);
      if (!isError && isBillableSkill(label)) {
        billableCalls += 1;
      }

      feedEntries.push({
        timestamp: nowTime(),
        method,
        skill: label,
        result: displayResult,
        isError,
        statusCode
      });

      if (meta) {
        lastInspector = {
          method: meta.method ?? '-',
          path: meta.path ?? '-',
          statusCode: meta.statusCode,
          body: meta.body ?? {},
          response: meta.response ?? {}
        };
      }

      void rerender();
    },
    updatePrices(pricesMap) {
      // Merge incoming prices into existing entries
      priceEntries = priceEntries.map((entry) => {
        const incoming = pricesMap[entry.token];
        if (incoming !== undefined) {
          return { ...entry, usd: incoming };
        }
        return entry;
      });
      // Also add any new tokens
      for (const [token, price] of Object.entries(pricesMap)) {
        if (!priceEntries.find((e) => e.token === token)) {
          priceEntries.push({ token, usd: price, change24h: null });
        }
      }
      priceSource = 'Live';
      priceUpdatedAt = Date.now();
      rerender();
    },
    logError(message) {
      errorCount += 1;
      feedEntries.push({ timestamp: nowTime(), method: '', skill: 'ERROR', result: message, isError: true });
      rerender();
    },
    setWalletInfo(info) {
      if (info.eth !== undefined) walletState.eth = info.eth;
      if (info.usdc !== undefined) walletState.usdc = info.usdc;
      if (info.keysIssued !== undefined) walletState.keysIssued = info.keysIssued;
      if (info.address !== undefined) walletState.address = info.address;
      if (info.network !== undefined) walletState.network = info.network;
      if (info.chainId !== undefined) walletState.chainId = info.chainId;
      rerender();
    },
    destroy() {
      if (pollTimer) clearInterval(pollTimer);
      if (widgets) widgets.screen.destroy();
    }
  };
}

export function startDashboard(): Dashboard {
  const port = loadConfig().port ?? 4020;
  if (process.env.PINION_NO_DASHBOARD === '1') {
    const dashboard = createFallbackDashboard(port);
    activeDashboard = dashboard;
    return dashboard;
  }
  const dashboard = buildDashboard(port);
  activeDashboard = dashboard;
  return dashboard;
}

export function logSkillCall(skill: string, param: string, result: string): void {
  activeDashboard?.logSkillCall(skill, param, result);
}

export function updatePrices(prices: Record<string, string>): void {
  activeDashboard?.updatePrices(prices);
}

export function logError(message: string): void {
  activeDashboard?.logError(message);
}
