import axios from 'axios';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const API = 'http://localhost:4020';

function wrapResult(result: unknown): { content: Array<{ type: 'text'; text: string }> } {
  return { content: [{ type: 'text', text: JSON.stringify(result) }] };
}

async function get(path: string): Promise<unknown> {
  return (await axios.get(`${API}${path}`)).data;
}

async function post(path: string, body: Record<string, unknown>): Promise<unknown> {
  return (await axios.post(`${API}${path}`, body)).data;
}

async function main(): Promise<void> {
  const server = new McpServer({
    name: 'pinion-emulator',
    version: '0.1.0'
  });

  server.tool('pinion_price', { token: z.string() }, async ({ token }) =>
    wrapResult(await get(`/price/${token}`))
  );
  server.tool('pinion_balance', { address: z.string() }, async ({ address }) =>
    wrapResult(await get(`/balance/${address}`))
  );
  server.tool('pinion_wallet', {}, async () => wrapResult(await get('/wallet')));
  server.tool('pinion_tx', { hash: z.string() }, async ({ hash }) =>
    wrapResult(await get(`/tx/${hash}`))
  );
  server.tool('pinion_chat', { message: z.string() }, async ({ message }) =>
    wrapResult(await post('/chat', { message }))
  );
  server.tool(
    'pinion_send',
    { to: z.string(), amount: z.string(), token: z.string() },
    async (args) => wrapResult(await post('/send', args))
  );
  server.tool(
    'pinion_trade',
    { src: z.string(), dst: z.string(), amount: z.string() },
    async (args) => wrapResult(await post('/trade', args))
  );
  server.tool('pinion_fund', { address: z.string() }, async ({ address }) =>
    wrapResult(await get(`/fund/${address}`))
  );
  server.tool('pinion_broadcast', {}, async () => wrapResult(await post('/broadcast', {})));
  server.tool('pinion_unlimited', {}, async () => wrapResult(await get('/unlimited')));

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
