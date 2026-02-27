import { loadConfig } from '../config';
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
}

export interface Dashboard {
  logSkillCall(skill: string, param: string, result: string, meta?: SkillLogMeta): void;
  updatePrices(prices: Record<string, string>): void;
  logError(message: string): void;
  setWalletInfo(info: Partial<WalletPanelState>): void;
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
  screen: (opts: { smartCSR: boolean; title: string }) => BlessedScreen;
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
  grid: new (opts: { rows: number; cols: number; screen: BlessedScreen }) => GridLayout;
}

function asContentWidget(value: unknown): { setContent: (content: string) => void } {
  return value as { setContent: (content: string) => void };
}

function asFeedWidget(value: unknown): { setContent: (content: string) => void; setScrollPerc: (p: number) => void } {
  return value as { setContent: (content: string) => void; setScrollPerc: (p: number) => void };
}

let activeDashboard: Dashboard | null = null;

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
  return keys[0] ?? '0x0000000000000000000000000000000000000123';
}

function createFallbackDashboard(port: number): Dashboard {
  printHeader(port);

  return {
    logSkillCall(skill, param, result, meta) {
      const label = param ? `${skill}(${param})` : skill;
      // eslint-disable-next-line no-console
      console.log(`[${nowTime()}] ${label} -> ${result}`);
      if (meta) {
        // eslint-disable-next-line no-console
        console.log(`${meta.method ?? '-'} ${meta.path ?? '-'} body=${JSON.stringify(meta.body ?? {})}`);
      }
    },
    updatePrices(prices) {
      // eslint-disable-next-line no-console
      console.log('[PRICES]', prices);
    },
    logError(message) {
      // eslint-disable-next-line no-console
      console.error(`[ERROR] ${message}`);
    },
    setWalletInfo() {
      // no-op
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
  if (typeof data.ETH === 'string') {
    return `${data.ETH} ETH`;
  }
  if (typeof data.toAmount === 'string') {
    return `${data.toAmount} ${String(data.toToken ?? '')}`.trim();
  }
  if (typeof data.address === 'string') {
    return String(data.address);
  }
  if (typeof data.reply === 'string' || typeof data.response === 'string') {
    return 'mock reply';
  }
  if (typeof data.txHash === 'string' || typeof data.hash === 'string') {
    return String(data.txHash ?? data.hash);
  }
  return 'ok';
}

function parsePricePayload(payload: Record<string, unknown>): PriceEntry[] {
  const out: PriceEntry[] = [];
  for (const token of ['ETH', 'BTC', 'SOL', 'USDC']) {
    const row = payload[token] as Record<string, unknown> | undefined;
    if (row && typeof row.usd === 'number') {
      out.push({ token, usd: row.usd.toFixed(2), change24h: typeof row.usd_24h_change === 'number' ? row.usd_24h_change : null });
    }
  }
  return out;
}

function buildDashboard(port: number): Dashboard {
  let widgets: ScreenWidgets | null = null;
  let pollTimer: NodeJS.Timeout | null = null;
  const startTs = Date.now();
  let totalCalls = 0;
  const feedEntries: FeedEntry[] = [];

  const walletState: WalletPanelState = {
    eth: loadConfig().balances.default?.ETH ?? '1.5',
    usdc: loadConfig().balances.default?.USDC ?? '250.00',
    keysIssued: 0,
    address: firstConfiguredAddress()
  };

  let lastInspector: InspectorState = {
    method: '-',
    path: '-',
    body: {},
    response: {}
  };

  let priceEntries: PriceEntry[] = [
    { token: 'ETH', usd: 'Fetching...', change24h: null },
    { token: 'BTC', usd: 'Fetching...', change24h: null },
    { token: 'SOL', usd: 'Fetching...', change24h: null },
    { token: 'USDC', usd: '1.00', change24h: null }
  ];
  let priceSource = 'Boot';
  let priceUpdatedAt = Date.now();

  function rerender(): void {
    if (!widgets) {
      return;
    }

    widgets.header.setContent(buildHeaderText(port));
    widgets.prices.setContent(renderPrices(priceEntries, priceSource, Math.floor((Date.now() - priceUpdatedAt) / 1000)));
    widgets.wallet.setContent(renderWallet(walletState));
    widgets.feed.setContent(renderFeed(feedEntries.slice(-12), totalCalls, totalCalls * 0.01, uptime(startTs)));
    widgets.feed.setScrollPerc(100);
    widgets.inspector.setContent(renderInspector(lastInspector));
    widgets.screen.render();
  }

  async function refreshPrices(): Promise<void> {
    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin,solana,usd-coin&vs_currencies=usd&include_24hr_change=true'
      );
      const json = (await response.json()) as Record<string, unknown>;
      const map = {
        ETH: json.ethereum,
        BTC: json.bitcoin,
        SOL: json.solana,
        USDC: json['usd-coin']
      } as Record<string, unknown>;

      const parsed = parsePricePayload(map);
      if (parsed.length > 0) {
        priceEntries = parsed;
        priceSource = 'CoinGecko';
        priceUpdatedAt = Date.now();
        rerender();
      }
    } catch {
      // keep old values and continue
    }
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const blessed = require('blessed') as BlessedModule;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const contrib = require('blessed-contrib') as ContribModule;

    const screen = blessed.screen({ smartCSR: true, title: 'PinionOS Emulator' });
    const grid = new contrib.grid({ rows: 24, cols: 12, screen });

    const header = asContentWidget(
      grid.set(0, 0, 10, 12, blessed.box, {
        tags: false,
        border: { type: 'line' },
        label: ' PINION OS '
      })
    );

    const prices = asContentWidget(
      grid.set(10, 0, 4, 6, blessed.box, {
        border: { type: 'line' },
        label: ' LIVE PRICES '
      })
    );

    const wallet = asContentWidget(
      grid.set(10, 6, 4, 6, blessed.box, {
        border: { type: 'line' },
        label: ' MOCK WALLET '
      })
    );

    const feed = asFeedWidget(
      grid.set(14, 0, 6, 12, blessed.box, {
        border: { type: 'line' },
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
        label: ' LAST REQUEST / RESPONSE ',
        tags: false,
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
    pollTimer = setInterval(() => {
      void refreshPrices();
    }, 5_000);
  } catch {
    return createFallbackDashboard(port);
  }

  return {
    logSkillCall(skill, param, result, meta) {
      totalCalls += 1;
      if (skill.toLowerCase() === 'unlimited' && meta?.response && typeof meta.response === 'object') {
        const data = ((meta.response as Record<string, unknown>).data ?? meta.response) as Record<string, unknown>;
        if (typeof data.key === 'string') {
          walletState.keysIssued += 1;
        }
      }

      feedEntries.push({
        timestamp: nowTime(),
        skill: param ? `${skill}(${param})` : skill,
        result: result || summarizeResponseFallback(meta)
      });

      if (meta) {
        lastInspector = {
          method: meta.method ?? '-',
          path: meta.path ?? '-',
          body: meta.body ?? {},
          response: meta.response ?? {}
        };
      }
      rerender();
    },
    updatePrices(pricesMap) {
      priceEntries = ['ETH', 'BTC', 'SOL', 'USDC'].map((token) => ({
        token,
        usd: pricesMap[token] ?? (token === 'USDC' ? '1.00' : '0.00'),
        change24h: null
      }));
      priceSource = 'Manual';
      priceUpdatedAt = Date.now();
      rerender();
    },
    logError(message) {
      feedEntries.push({ timestamp: nowTime(), skill: 'ERROR', result: message });
      rerender();
    },
    setWalletInfo(info) {
      if (info.eth !== undefined) walletState.eth = info.eth;
      if (info.usdc !== undefined) walletState.usdc = info.usdc;
      if (info.keysIssued !== undefined) walletState.keysIssued = info.keysIssued;
      if (info.address !== undefined) walletState.address = info.address;
      rerender();
    }
  };
}

export function startDashboard(): Dashboard {
  const port = loadConfig().port ?? 4020;
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
