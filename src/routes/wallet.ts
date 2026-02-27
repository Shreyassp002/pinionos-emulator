import { Router } from 'express';
import { Wallet } from 'ethers';
import { success } from '../types';

const router = Router();

router.get('/', (_req, res) => {
  const wallet = Wallet.createRandom();
  res.json(
    success({
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic: wallet.mnemonic?.phrase ?? null
    })
  );
});

export default router;
