process.env.PINION_API_URL = 'http://localhost:4020';

import { PinionClient } from 'pinion-os';

const client = new PinionClient({
  privateKey: '0x0000000000000000000000000000000000000000000000000000000000000001'
});

let iteration = 0;

async function runOnce(): Promise<void> {
  iteration += 1;
  console.log('\n=== Yield Check', iteration, '===');

  const priceResult = await client.skills.price('ETH');
  const ethPrice = Number(priceResult.data?.usd ?? 0);
  console.log('ETH Price:', ethPrice);

  const decision = ethPrice < 3000 ? 'BUY ETH->USDC rebalance' : 'HOLD';
  console.log('Decision:', decision);

  if (decision.startsWith('BUY')) {
    const tradeResult = await client.skills.trade('ETH', 'USDC', '0.01');
    console.log('Trade Executed:', tradeResult.data?.toAmount ?? 'n/a', 'USDC');
    console.log('Simulated Yield: +$0.02');
  }
}

runOnce().catch((error) => {
  console.error(error);
  process.exit(1);
});

setInterval(() => {
  runOnce().catch((error) => {
    console.error('Loop error:', error);
  });
}, 10_000);
