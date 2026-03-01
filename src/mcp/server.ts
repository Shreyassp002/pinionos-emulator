import axios from 'axios';
import fs from 'node:fs';
import path from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';

// ── Spend tracker ──────────────────────────────────────────────────────
const spendTracker: {
  maxAtomic: number;
  spentAtomic: number;
  calls: number;
  limited: boolean;
} = { maxAtomic: 0, spentAtomic: 0, calls: 0, limited: false };

const SKILL_COST_ATOMIC = 10_000; // $0.01 in USDC 6-decimal atomic units
const UNLIMITED_COST_ATOMIC = 100_000_000; // $100

function checkSpend(cost: number): string | null {
  if (!spendTracker.limited) return null;
  if (spendTracker.spentAtomic + cost > spendTracker.maxAtomic) {
    const remaining = Math.max(0, spendTracker.maxAtomic - spendTracker.spentAtomic);
    return `Spend limit exceeded. Remaining: $${(remaining / 1_000_000).toFixed(6)}, required: $${(cost / 1_000_000).toFixed(6)}`;
  }
  return null;
}

function recordSpend(cost: number): void {
  if (!spendTracker.limited) return;
  spendTracker.spentAtomic += cost;
  spendTracker.calls += 1;
}

// ── Wallet setup state ─────────────────────────────────────────────────
let setupAddress: string | null = process.env.PINION_PRIVATE_KEY ? '0x_from_env' : null;

function requireSetup(): string | null {
  if (!setupAddress) {
    return 'Wallet not configured. Call pinion_setup first with action "import" or "generate".';
  }
  return null;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}

function readPortFromConfigFile(): number | null {
  const configPath = process.env.PINION_CONFIG_PATH
    ? path.resolve(process.env.PINION_CONFIG_PATH)
    : path.resolve(process.cwd(), 'config.json');
  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw) as { port?: unknown };
    return typeof parsed.port === 'number' ? parsed.port : null;
  } catch {
    return null;
  }
}

function resolveApiBaseUrl(): string {
  const envUrl = process.env.PINION_EMULATOR_URL ?? process.env.PINION_API_URL;
  if (envUrl && envUrl.trim()) {
    return normalizeBaseUrl(envUrl.trim());
  }

  const port = readPortFromConfigFile() ?? 4020;
  return `http://localhost:${port}`;
}

const API = resolveApiBaseUrl();

function wrapResult(result: unknown): { content: Array<{ type: 'text'; text: string }> } {
  return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
}

async function get(path: string): Promise<unknown> {
  const envelope = (await axios.get(`${API}${path}`)).data as { data?: unknown };
  return envelope.data ?? envelope;
}

async function post(path: string, body: Record<string, unknown>): Promise<unknown> {
  const envelope = (await axios.post(`${API}${path}`, body)).data as { data?: unknown };
  return envelope.data ?? envelope;
}

async function main(): Promise<void> {
  const server = new McpServer({
    name: 'pinionos-emulator',
    version: '0.1.0',
    description: 'Local PinionOS emulator — zero-cost mock of all PinionOS skill APIs'
  });

  // Use the typed tool registration API
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tool = (server.tool as any).bind(server);

  /** Wraps a paid tool handler with setup + spend checks */
  function paidTool(
    name: string,
    description: string,
    schema: Record<string, z.ZodTypeAny>,
    handler: (args: any) => Promise<ReturnType<typeof wrapResult>>,
    cost = SKILL_COST_ATOMIC
  ): void {
    tool(name, description, schema, async (args: any) => {
      const setupErr = requireSetup();
      if (setupErr) return wrapResult({ error: setupErr });
      const spendErr = checkSpend(cost);
      if (spendErr) return wrapResult({ error: spendErr });
      const result = await handler(args);
      recordSpend(cost);
      return result;
    });
  }

  // ── Free tools ──────────────────────────────────────────────────────

  tool(
    'pinion_setup',
    'Configure wallet for PinionOS. Required before using paid tools.',
    {
      action: z.enum(['import', 'generate']).describe('"import" to use an existing key, "generate" to create a new one'),
      private_key: z.string().optional().describe('Private key (required for "import")')
    },
    async ({ action, private_key }: { action: 'import' | 'generate'; private_key?: string }) => {
      if (action === 'import') {
        if (!private_key || !private_key.startsWith('0x') || private_key.length < 66) {
          return wrapResult({ error: 'Invalid private key. Must be a 0x-prefixed 64-character hex string.' });
        }
        setupAddress = `0x${randomBytes(20).toString('hex')}`;
        return wrapResult({ status: 'ok', address: setupAddress, action: 'imported' });
      }
      // generate
      const addr = `0x${randomBytes(20).toString('hex')}`;
      const key = `0x${randomBytes(32).toString('hex')}`;
      setupAddress = addr;
      return wrapResult({ status: 'ok', address: addr, privateKey: key, action: 'generated' });
    }
  );

  tool(
    'pinion_spend_limit',
    'Manage spend budget for PinionOS skill calls. Actions: set, status, clear.',
    {
      action: z.enum(['set', 'status', 'clear']).describe('Action to perform'),
      max_usdc: z.string().optional().describe('Max budget in USDC (required for "set"), e.g. "0.05"')
    },
    async ({ action, max_usdc }: { action: 'set' | 'status' | 'clear'; max_usdc?: string }) => {
      if (action === 'set') {
        if (!max_usdc) return wrapResult({ error: 'max_usdc is required for "set" action' });
        const parsed = parseFloat(max_usdc);
        if (isNaN(parsed) || parsed <= 0) return wrapResult({ error: 'max_usdc must be a positive number' });
        spendTracker.maxAtomic = Math.round(parsed * 1_000_000);
        spendTracker.spentAtomic = 0;
        spendTracker.calls = 0;
        spendTracker.limited = true;
        return wrapResult({ status: 'ok', maxBudget: max_usdc, message: `Spend limit set to $${max_usdc} USDC` });
      }
      if (action === 'clear') {
        spendTracker.limited = false;
        spendTracker.maxAtomic = 0;
        spendTracker.spentAtomic = 0;
        spendTracker.calls = 0;
        return wrapResult({ status: 'ok', message: 'Spend limit cleared' });
      }
      // status
      const max = spendTracker.limited ? (spendTracker.maxAtomic / 1_000_000).toFixed(6) : 'unlimited';
      const spent = (spendTracker.spentAtomic / 1_000_000).toFixed(6);
      const remaining = spendTracker.limited
        ? (Math.max(0, spendTracker.maxAtomic - spendTracker.spentAtomic) / 1_000_000).toFixed(6)
        : 'unlimited';
      return wrapResult({
        maxBudget: max,
        spent,
        remaining,
        callCount: spendTracker.calls,
        isLimited: spendTracker.limited
      });
    }
  );

  tool(
    'pinion_catalog',
    'List all available PinionOS skills with prices and descriptions.',
    {},
    async () => wrapResult(await get('/catalog'))
  );

  // ── Paid tools ──────────────────────────────────────────────────────

  paidTool(
    'pinion_price',
    'Get the current USD price for a token (ETH, BTC, SOL, USDC, MATIC). Returns priceUSD and 24h change.',
    { token: z.string().describe('Token symbol, e.g. ETH') },
    async ({ token }: { token: string }) => wrapResult(await get(`/price/${token}`))
  );

  paidTool(
    'pinion_balance',
    'Get ETH and USDC balances for a Base wallet address.',
    { address: z.string().describe('Ethereum/Base wallet address (0x...)') },
    async ({ address }: { address: string }) => wrapResult(await get(`/balance/${address}`))
  );

  paidTool(
    'pinion_wallet',
    'Generate a fresh Base wallet keypair (address + private key). For testing only — never use for real funds.',
    {},
    async () => wrapResult(await get('/wallet/generate'))
  );

  paidTool(
    'pinion_tx',
    'Look up decoded transaction details for a Base tx hash.',
    { hash: z.string().describe('Transaction hash (0x...)') },
    async ({ hash }: { hash: string }) => wrapResult(await get(`/tx/${hash}`))
  );

  paidTool(
    'pinion_chat',
    'Chat with the Pinion AI agent. Pass a message and optionally conversation history.',
    {
      message: z.string().describe('The user message to send'),
      history: z
        .array(z.object({ role: z.string(), content: z.string() }))
        .optional()
        .describe('Prior conversation messages')
    },
    async ({ message, history }: { message: string; history?: Array<{ role: string; content: string }> }) => {
      const messages = history
        ? [...history, { role: 'user', content: message }]
        : [{ role: 'user', content: message }];
      return wrapResult(await post('/chat', { messages }));
    }
  );

  paidTool(
    'pinion_send',
    'Build an unsigned ETH or ERC-20 transfer transaction. Sign and broadcast with pinion_broadcast.',
    {
      to: z.string().describe('Recipient address (0x...)'),
      amount: z.string().describe('Amount to send, e.g. "0.01"'),
      token: z.string().describe('Token to send (ETH, USDC, WETH, DAI, WBTC, CBETH)')
    },
    async (args: { to: string; amount: string; token: string }) => wrapResult(await post('/send', args))
  );

  paidTool(
    'pinion_trade',
    'Get an unsigned swap transaction via Uniswap V3 on Base. Sign and broadcast with pinion_broadcast.',
    {
      src: z.string().describe('Source token symbol, e.g. ETH'),
      dst: z.string().describe('Destination token symbol, e.g. USDC'),
      amount: z.string().describe('Amount of src token to swap'),
      slippage: z.number().optional().describe('Slippage tolerance in percent, default 1')
    },
    async (args: { src: string; dst: string; amount: string; slippage?: number }) =>
      wrapResult(await post('/trade', args))
  );

  paidTool(
    'pinion_fund',
    'Get wallet balance and funding instructions for a Base address. Includes deposit address and bridging steps.',
    { address: z.string().describe('Wallet address to check and get funding info for') },
    async ({ address }: { address: string }) => wrapResult(await get(`/fund/${address}`))
  );

  paidTool(
    'pinion_broadcast',
    'Sign and broadcast a transaction on Base. Pass the unsigned tx object from pinion_send or pinion_trade.',
    {
      tx: z
        .object({
          to: z.string().describe('Transaction recipient'),
          data: z.string().optional().describe('Calldata hex'),
          value: z.string().optional().describe('ETH value in wei'),
          gasLimit: z.string().optional().describe('Gas limit')
        })
        .describe('Unsigned transaction object'),
      privateKey: z.string().optional().describe('Private key to sign with (uses emulator default if omitted)')
    },
    async (args: { tx: { to: string; data?: string; value?: string; gasLimit?: string }; privateKey?: string }) =>
      wrapResult(await post('/broadcast', args))
  );

  paidTool(
    'pinion_unlimited',
    'Purchase (simulated) unlimited access to all Pinion OS skills. Returns an API key for X-API-KEY header.',
    {},
    async () => wrapResult(await post('/unlimited', {})),
    UNLIMITED_COST_ATOMIC
  );

  tool(
    'pinion_unlimited_verify',
    'Verify whether an unlimited API key is valid. Returns validity status and associated address.',
    { key: z.string().describe('The API key to verify (from pinion_unlimited)') },
    async ({ key }: { key: string }) => {
      const res = await axios.get(`${API}/unlimited/verify`, { params: { key } });
      return wrapResult(res.data);
    }
  );

  tool(
    'pinion_pay_service',
    'Call a generic x402-paywalled service endpoint. The emulator accepts any payment and returns mock data.',
    {
      url: z.string().describe('The x402 service URL path, e.g. /x402/my-service'),
      method: z.enum(['GET', 'POST']).optional().describe('HTTP method (default GET)'),
      body: z.record(z.unknown()).optional().describe('Request body for POST requests')
    },
    async ({ url, method, body }: { url: string; method?: string; body?: Record<string, unknown> }) => {
      const path = url.startsWith('/') ? url : `/${url}`;
      if (method === 'POST') {
        return wrapResult(await post(path, body ?? {}));
      }
      return wrapResult(await get(path));
    }
  );

  tool(
    'pinion_facilitator_verify',
    'Verify an x402 payment via the mock facilitator. Always returns success in emulator mode.',
    {
      payment: z.record(z.unknown()).optional().describe('The x402 payment object'),
      resource: z.string().optional().describe('The resource URL the payment is for')
    },
    async ({ payment, resource }: { payment?: Record<string, unknown>; resource?: string }) =>
      wrapResult(await post('/facilitator/verify', { payment: payment ?? {}, resource: resource ?? 'unknown' }))
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
