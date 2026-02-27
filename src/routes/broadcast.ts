import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { success } from '../types';

const router = Router();

router.post('/', (_req, res) => {
  const txHash = `0x${randomBytes(32).toString('hex')}`;
  console.log('[MOCK BROADCAST] TxHash:', txHash);

  res.json(
    success({
      txHash,
      status: 'broadcasted',
      blockExplorer: `https://basescan.org/tx/${txHash}`
    })
  );
});

export default router;
