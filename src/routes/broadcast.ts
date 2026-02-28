import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { Wallet } from 'ethers';
import { getNetworkInfo } from '../config';
import { errorResponse, success } from '../types';

const router = Router();

router.post('/', (req, res) => {
  const txHash = `0x${randomBytes(32).toString('hex')}`;
  const to = String(req.body?.tx?.to ?? req.body?.to ?? `0x${randomBytes(20).toString('hex')}`);
  const rawKey = req.body?.privateKey;

  let from: string;
  if (typeof rawKey === 'string' && rawKey.length > 0) {
    try {
      from = new Wallet(rawKey).address;
    } catch {
      res.status(400).json(errorResponse('invalid privateKey'));
      return;
    }
  } else {
    from = `0x${randomBytes(20).toString('hex')}`;
  }

  const net = getNetworkInfo();
  res.json(
    success({
      txHash,
      from,
      to,
      network: net.name,
      chainId: net.chainId,
      explorer: `${net.explorer}/tx/${txHash}`,
      note: 'Transaction broadcast simulated locally.',
      timestamp: new Date().toISOString()
    })
  );
});

export default router;
