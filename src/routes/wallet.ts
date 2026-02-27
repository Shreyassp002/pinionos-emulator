import { Router } from 'express';
import { Wallet } from 'ethers';
import { success } from '../types';

const router = Router();
const BASE_CHAIN_ID = 8453;

function buildWalletResponse() {
  const wallet = Wallet.createRandom();
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
    mnemonic: wallet.mnemonic?.phrase ?? null,
    network: 'base',
    chainId: BASE_CHAIN_ID,
    note: 'Mock wallet generated locally.',
    timestamp: new Date().toISOString()
  };
}

router.get('/', (_req, res) => {
  res.json(success(buildWalletResponse()));
});

// SDK compatibility: pinion-os currently calls /wallet/generate
router.get('/generate', (_req, res) => {
  res.json(success(buildWalletResponse()));
});

export default router;
