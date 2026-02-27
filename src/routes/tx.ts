import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { errorResponse, success } from '../types';

const router = Router();

function randomAddress(): string {
  return `0x${randomBytes(20).toString('hex')}`;
}

router.get('/:hash', (req, res) => {
  const hash = String(req.params.hash || '');
  if (!hash) {
    res.status(400).json(errorResponse('tx hash is required'));
    return;
  }

  const blockNumber = 5_000_000 + Math.floor(Math.random() * 10_000_000);

  res.json(
    success({
      hash,
      network: 'base',
      from: randomAddress(),
      to: randomAddress(),
      value: '0.01',
      token: 'ETH',
      gasUsed: '21000',
      blockNumber,
      status: 'confirmed',
      timestamp: new Date().toISOString(),
      timestampUnix: Math.floor(Date.now() / 1000)
    })
  );
});

export default router;
