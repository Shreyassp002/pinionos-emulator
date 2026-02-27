import { Router } from 'express';
import { errorResponse, success } from '../types';

const router = Router();

router.get('/:address', (req, res) => {
  const address = String(req.params.address || '');
  if (!address) {
    res.status(400).json(errorResponse('address is required'));
    return;
  }

  res.json(
    success({
      address,
      currentBalance: { ETH: '0.0', USDC: '0.0' },
      balances: { ETH: '0.0', USDC: '0.0' },
      depositAddress: address,
      instructions: ['Send ETH to address for gas', 'Send USDC for skill payments'],
      minimumFund: '5.00 USDC',
      network: 'base',
      chainId: 8453,
      funding: {
        steps: ['Bridge USDC to Base if needed', 'Send ETH for gas', 'Send USDC for skills'],
        minimumRecommended: {
          ETH: '0.005',
          USDC: '5.00'
        },
        bridgeUrl: 'https://bridge.base.org'
      },
      timestamp: new Date().toISOString()
    })
  );
});

export default router;
