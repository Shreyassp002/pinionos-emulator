process.env.PINION_API_URL = 'http://localhost:4020';

import { PinionClient } from 'pinion-os';

const client = new PinionClient({
  privateKey: '0x0000000000000000000000000000000000000000000000000000000000000001',
  apiUrl: 'http://localhost:4020'
});

let iteration = 0;
const MAX_ITERATIONS = 5;
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

async function runOnce(): Promise<void> {
  iteration += 1;
  console.log(`\n${YELLOW}=== Yield Check ${iteration} ===${RESET}`);

  const priceResult = (await client.skills.price('ETH')) as unknown as {
    data?: { usd?: string };
  };
  const ethPrice = Number(priceResult.data?.usd ?? 0);
  console.log(`${YELLOW}ETH Price:${RESET}`, ethPrice);

  const decision = ethPrice > 2000 ? 'TRADE' : 'HOLD';
  console.log(`${YELLOW}Decision:${RESET}`, decision);

  if (decision === 'TRADE') {
    const tradeResult = (await client.skills.trade('ETH', 'USDC', '0.01')) as unknown as {
      data?: { toAmount?: string };
    };
    console.log(`${GREEN}TRADE EXECUTED${RESET}:`, tradeResult.data?.toAmount ?? 'n/a', 'USDC');
  }

  const chat = (await client.skills.chat('suggest yield strategy')) as unknown as {
    data?: { reply?: string };
  };
  console.log(`${YELLOW}AI:${RESET}`, chat.data?.reply ?? 'No suggestion');
  console.log(`${GREEN}Earned:${RESET} $0.02 (custom skill fee simulated)`);
  console.log(`${YELLOW}Summary:${RESET}`, new Date().toISOString(), `price=${ethPrice}`, `decision=${decision}`);
}

runOnce().catch((error) => {
  console.error(error);
  process.exit(1);
});

const interval = setInterval(() => {
  if (iteration >= MAX_ITERATIONS) {
    clearInterval(interval);
    console.log(`${GREEN}Completed ${MAX_ITERATIONS} iterations. Exiting.${RESET}`);
    process.exit(0);
  }

  runOnce().catch((error) => {
    console.error('Loop error:', error);
    clearInterval(interval);
    process.exit(1);
  });
}, 10_000);
