import { Router } from 'express';
import { getNetworkInfo } from '../config';
import { credit, getBalances } from '../state/balances';
import { errorResponse, success } from '../types';
import type { Dashboard } from '../ui/dashboard';

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

// Faucet amounts credited on each fund call
const FAUCET_ETH = 0.01;
const FAUCET_USDC = 10;

export function createFundRouter(dashboard?: Dashboard): Router {
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

  // Credit faucet amounts
  credit(address, 'ETH', FAUCET_ETH);
  credit(address, 'USDC', FAUCET_USDC);

  const balances = getBalances(address);

  // Update dashboard wallet panel
  if (dashboard) {
    dashboard.setWalletInfo({ eth: balances.ETH ?? '0', usdc: balances.USDC ?? '0' });
  }

  const net = getNetworkInfo();
  res.json(
    success({
      address,
      network: net.name,
      chainId: net.chainId,
      balances,
      depositAddress: address,
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

return router;
}

export default createFundRouter();
