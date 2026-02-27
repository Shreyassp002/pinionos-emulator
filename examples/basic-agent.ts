process.env.PINION_API_URL = 'http://localhost:4020';

import { PinionClient } from 'pinion-os';

async function run(): Promise<void> {
  const pinion = new PinionClient({
    privateKey: '0x0000000000000000000000000000000000000000000000000000000000000001'
  });

  console.log('=== STEP 1: PRICE ===');
  const price = await pinion.skills.price('ETH');
  console.log(price);

  console.log('\n=== STEP 2: BALANCE ===');
  const balance = await pinion.skills.balance('0x0000000000000000000000000000000000000123');
  console.log(balance);

  console.log('\n=== STEP 3: WALLET ===');
  const wallet = await pinion.skills.wallet();
  console.log(wallet);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
