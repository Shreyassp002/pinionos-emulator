import { Router } from 'express';
import { loadConfig } from '../config';
import { errorResponse, success } from '../types';

const router = Router();

router.get('/:address', (req, res) => {
  const address = String(req.params.address || '');
  if (!address) {
    res.status(400).json(errorResponse('address is required'));
    return;
  }

  const config = loadConfig();
  const fromConfig = config.balances[address] || config.balances.default;

  if (!fromConfig) {
    res.status(500).json(errorResponse('default balance config missing'));
    return;
  }

  res.json(
    success({
      address,
      ETH: fromConfig.ETH,
      USDC: fromConfig.USDC,
      network: 'base'
    })
  );
});

export default router;
