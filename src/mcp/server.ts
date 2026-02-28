import axios from 'axios';
import fs from 'node:fs';
import path from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

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
    name: 'pinion-emulator',
    version: '0.1.0',
    description: 'Local PinionOS emulator — zero-cost mock of all PinionOS skill APIs'
  });

  // Use the typed tool registration API
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tool = (server.tool as any).bind(server);

  tool(
    'pinion_price',
    'Get the current USD price for a token (ETH, BTC, SOL, USDC, MATIC). Returns priceUSD and 24h change.',
    { token: z.string().describe('Token symbol, e.g. ETH') },
    async ({ token }: { token: string }) => wrapResult(await get(`/price/${token}`))
  );

  tool(
    'pinion_balance',
    'Get ETH and USDC balances for a Base wallet address.',
    { address: z.string().describe('Ethereum/Base wallet address (0x...)') },
    async ({ address }: { address: string }) => wrapResult(await get(`/balance/${address}`))
  );

  tool(
    'pinion_wallet',
    'Generate a fresh Base wallet keypair (address + private key). For testing only — never use for real funds.',
    {},
    async () => wrapResult(await get('/wallet/generate'))
  );

  tool(
    'pinion_tx',
    'Look up decoded transaction details for a Base tx hash.',
    { hash: z.string().describe('Transaction hash (0x...)') },
    async ({ hash }: { hash: string }) => wrapResult(await get(`/tx/${hash}`))
  );

  tool(
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

  tool(
    'pinion_send',
    'Build an unsigned ETH or ERC-20 transfer transaction. Sign and broadcast with pinion_broadcast.',
    {
      to: z.string().describe('Recipient address (0x...)'),
      amount: z.string().describe('Amount to send, e.g. "0.01"'),
      token: z.string().describe('Token to send (ETH, USDC, WETH, DAI, WBTC, CBETH)')
    },
    async (args: { to: string; amount: string; token: string }) => wrapResult(await post('/send', args))
  );

  tool(
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

  tool(
    'pinion_fund',
    'Get wallet balance and funding instructions for a Base address. Includes deposit address and bridging steps.',
    { address: z.string().describe('Wallet address to check and get funding info for') },
    async ({ address }: { address: string }) => wrapResult(await get(`/fund/${address}`))
  );

  tool(
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

  tool(
    'pinion_unlimited',
    'Purchase (simulated) unlimited access to all Pinion OS skills. Returns an API key for X-API-KEY header.',
    {},
    async () => wrapResult(await post('/unlimited', {}))
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
