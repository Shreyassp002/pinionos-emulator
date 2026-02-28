import { Router } from 'express';
import { getNetworkInfo } from '../config';
import { getBalances } from '../state/balances';
import { errorResponse, success } from '../types';

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

const router = Router();

router.get('/:address', (req, res) => {
  const address = String(req.params.address || '');
  if (!address) {
    res.status(400).json(errorResponse('address is required'));
    return;
  }

  if (!ADDRESS_RE.test(address)) {
    res.status(400).json(errorResponse('invalid ethereum address'));
    return;
  }

  const balances = getBalances(address);

  const net = getNetworkInfo();
  res.json(
    success({
      address,
      network: net.name,
      balances,
      timestamp: new Date().toISOString()
    })
  );
});

export default router;
