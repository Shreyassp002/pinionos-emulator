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
      depositAddress: address,
      instructions: ['Send ETH to address for gas', 'Send USDC for skill payments'],
      minimumFund: '5.00 USDC',
      network: 'base'
    })
  );
});

export default router;
