import { Router } from 'express';
import { Wallet } from 'ethers';
import { getNetworkInfo } from '../config';
import type { Dashboard } from '../ui/dashboard';
import { success } from '../types';

function buildWalletResponse() {
  const wallet = Wallet.createRandom();
  const net = getNetworkInfo();
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
    network: net.name,
    chainId: net.chainId,
    note: 'Mock wallet generated locally. Never use for real funds.',
    timestamp: new Date().toISOString()
  };
}

export function createWalletRouter(dashboard?: Dashboard): Router {
  const router = Router();

  function handleWallet(_req: import('express').Request, res: import('express').Response) {
    const walletData = buildWalletResponse();
    // Update the dashboard wallet panel with the newly generated address
    if (dashboard) {
      dashboard.setWalletInfo({ address: walletData.address });
    }
    res.json(success(walletData));
  }

  router.get('/', handleWallet);
  // SDK compatibility: pinion-os calls /wallet/generate
  router.get('/generate', handleWallet);

  return router;
}

export default createWalletRouter();
