import { createHash } from 'node:crypto';
import { Router } from 'express';
import { getNetworkInfo } from '../config';
import { errorResponse, success } from '../types';

const router = Router();

/**
 * Derive a deterministic mock address from a seed string so the same
 * tx hash always returns the same from/to addresses.
 */
function deterministicAddress(seed: string): string {
  const hash = createHash('sha256').update(seed).digest('hex');
  return `0x${hash.slice(0, 40)}`;
}

function deterministicBlockNumber(hash: string): number {
  const hash2 = createHash('sha256').update(`block:${hash}`).digest('hex');
  const num = parseInt(hash2.slice(0, 8), 16);
  return 5_000_000 + (num % 10_000_000);
}

const TX_HASH_RE = /^0x[0-9a-fA-F]{64}$/;

router.get('/:hash', (req, res) => {
  const hash = String(req.params.hash || '');
  if (!hash) {
    res.status(400).json(errorResponse('tx hash is required'));
    return;
  }

  if (!TX_HASH_RE.test(hash)) {
    res.status(400).json(errorResponse('invalid transaction hash'));
    return;
  }

  const from = deterministicAddress(`from:${hash}`);
  const to = deterministicAddress(`to:${hash}`);
  const blockNumber = deterministicBlockNumber(hash);

  const net = getNetworkInfo();
  res.json(
    success({
      hash,
      network: net.name,
      from,
      to,
      value: '0.01',
      gasUsed: '21000',
      blockNumber,
      status: 'confirmed',
      timestamp: new Date().toISOString()
    })
  );
});

export default router;
