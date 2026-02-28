import { Router } from 'express';
import { AbiCoder, getAddress, id, parseEther, parseUnits } from 'ethers';
import { getNetworkInfo } from '../config';
import { deduct, getBalances } from '../state/balances';
import { errorResponse, success } from '../types';
import type { Dashboard } from '../ui/dashboard';
const DEFAULT_SENDER = 'default';

// ERC-20 token contract addresses on Base mainnet
const TOKEN_CONFIG: Record<string, { address: string; decimals: number }> = {
  USDC:  { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
  WETH:  { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
  CBETH: { address: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22', decimals: 18 },
  DAI:   { address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', decimals: 18 },
  WBTC:  { address: '0x0555E30da8f98308EdB960aa94C0Db47230d2B9c', decimals: 8 }
};

export function createSendRouter(dashboard?: Dashboard): Router {
const router = Router();

router.post('/', (req, res) => {
  const toRaw = String(req.body?.to ?? '');
  const amount = String(req.body?.amount ?? '');
  const token = String(req.body?.token ?? '').toUpperCase();
  const from = typeof req.body?.from === 'string' ? req.body.from : DEFAULT_SENDER;

  if (!toRaw || !amount || !token) {
    res.status(400).json(errorResponse('to, amount, and token are required'));
    return;
  }

  let to: string;
  try {
    to = getAddress(toRaw);
  } catch {
    res.status(400).json(errorResponse('invalid to address'));
    return;
  }

  const amountNum = Number(amount);
  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    res.status(400).json(errorResponse('amount must be a positive number'));
    return;
  }

  if (token !== 'ETH' && !TOKEN_CONFIG[token]) {
    res
      .status(400)
      .json(errorResponse(`unsupported token: ${token}. Supported: ETH, ${Object.keys(TOKEN_CONFIG).join(', ')}`));
    return;
  }

  const net = getNetworkInfo();
  let unsignedTx: { to: string; value: string; data: string; chainId: number };
  let note: string;
  try {
    if (token === 'ETH') {
      unsignedTx = {
        to,
        value: parseEther(amount).toString(),
        data: '0x',
        chainId: net.chainId
      };
      note = 'Mock unsigned ETH transfer. Sign locally before broadcast.';
    } else {
      const tokenCfg = TOKEN_CONFIG[token];
      const transferSelector = id('transfer(address,uint256)').slice(0, 10);
      const encodedArgs = AbiCoder.defaultAbiCoder()
        .encode(['address', 'uint256'], [to, parseUnits(amount, tokenCfg.decimals)])
        .slice(2);

      unsignedTx = {
        to: tokenCfg.address,
        data: `${transferSelector}${encodedArgs}`,
        value: '0',
        chainId: net.chainId
      };
      note = `Mock unsigned ${token} transfer. Sign locally before broadcast.`;
    }
  } catch {
    res.status(400).json(errorResponse('failed to build unsigned transaction'));
    return;
  }

  // Deduct from sender's balance only after tx construction succeeds.
  if (!deduct(from, token, amountNum)) {
    res.status(400).json(errorResponse(`insufficient ${token} balance`));
    return;
  }

  // Update dashboard wallet panel
  if (dashboard) {
    const bal = getBalances(from);
    dashboard.setWalletInfo({ eth: bal.ETH ?? '0', usdc: bal.USDC ?? '0' });
  }

  res.json(
    success({
      tx: unsignedTx,
      token,
      amount,
      network: net.name,
      note,
      timestamp: new Date().toISOString()
    })
  );
});

return router;
}

export default createSendRouter();
