import axios from 'axios';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const API = 'http://localhost:4020';

function wrapResult(result: unknown): { content: Array<{ type: 'text'; text: string }> } {
  return { content: [{ type: 'text', text: JSON.stringify(result) }] };
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
    version: '0.1.0'
  });
  const registerTool = (server.tool as unknown as (...args: unknown[]) => unknown).bind(server);

  registerTool('pinion_price', { token: z.string() }, async ({ token }: { token: string }) =>
    wrapResult(await get(`/price/${token}`))
  );
  registerTool('pinion_balance', { address: z.string() }, async ({ address }: { address: string }) =>
    wrapResult(await get(`/balance/${address}`))
  );
  registerTool('pinion_wallet', {}, async () => wrapResult(await get('/wallet')));
  registerTool('pinion_tx', { hash: z.string() }, async ({ hash }: { hash: string }) =>
    wrapResult(await get(`/tx/${hash}`))
  );
  registerTool('pinion_chat', { message: z.string() }, async ({ message }: { message: string }) =>
    wrapResult(await post('/chat', { message }))
  );
  registerTool(
    'pinion_send',
    { to: z.string(), amount: z.string(), token: z.string() },
    async (args: { to: string; amount: string; token: string }) => wrapResult(await post('/send', args))
  );
  registerTool(
    'pinion_trade',
    { src: z.string(), dst: z.string(), amount: z.string() },
    async (args: { src: string; dst: string; amount: string }) => wrapResult(await post('/trade', args))
  );
  registerTool('pinion_fund', { address: z.string() }, async ({ address }: { address: string }) =>
    wrapResult(await get(`/fund/${address}`))
  );
  registerTool('pinion_broadcast', {}, async () => wrapResult(await post('/broadcast', {})));
  registerTool('pinion_unlimited', {}, async () => wrapResult(await get('/unlimited')));

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
