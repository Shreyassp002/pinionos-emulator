import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { success } from '../types';

const router = Router();

router.post('/', (req, res) => {
  const txHash = `0x${randomBytes(32).toString('hex')}`;
  const to = String(req.body?.tx?.to ?? req.body?.to ?? `0x${randomBytes(20).toString('hex')}`);
  const from = `0x${randomBytes(20).toString('hex')}`;
  console.log('[MOCK BROADCAST] TxHash:', txHash);

  res.json(
    success({
      txHash,
      status: 'broadcasted',
      blockExplorer: `https://basescan.org/tx/${txHash}`,
      from,
      to,
      network: 'base',
      chainId: 8453,
      explorer: `https://basescan.org/tx/${txHash}`,
      note: 'Transaction broadcast simulated locally.',
      timestamp: new Date().toISOString()
    })
  );
});

export default router;
