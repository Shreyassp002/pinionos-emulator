import { Router } from 'express';
import { AbiCoder, getAddress, id, parseEther, parseUnits } from 'ethers';
import { errorResponse, success } from '../types';

const BASE_CHAIN_ID = 8453;
const USDC_DECIMALS = 6;

const router = Router();

router.post('/', (req, res) => {
  const toRaw = String(req.body?.to ?? '');
  const amount = String(req.body?.amount ?? '');
  const token = String(req.body?.token ?? '').toUpperCase();

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

  try {
    if (token === 'ETH') {
      const unsignedTx = {
        to,
        value: parseEther(amount).toString(),
        data: '0x',
        gasLimit: '21000',
        chainId: BASE_CHAIN_ID,
        type: 2
      };

      res.json(
        success({
          unsignedTx,
          fromToken: token,
          toAddress: to,
          amount,
          tx: {
            to: unsignedTx.to,
            value: unsignedTx.value,
            data: unsignedTx.data,
            chainId: unsignedTx.chainId
          },
          token,
          network: 'base',
          note: 'Mock unsigned transfer tx. Sign locally before broadcast.',
          timestamp: new Date().toISOString(),
          estimatedGasFee: '0.0001 ETH',
          status: 'unsigned'
        })
      );
      return;
    }

    const transferSelector = id('transfer(address,uint256)').slice(0, 10);
    const encodedArgs = AbiCoder.defaultAbiCoder()
      .encode(['address', 'uint256'], [to, parseUnits(amount, USDC_DECIMALS)])
      .slice(2);

    const unsignedTx = {
      to: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      data: `${transferSelector}${encodedArgs}`,
      value: '0',
      gasLimit: '65000',
      chainId: BASE_CHAIN_ID,
      type: 2
    };

    res.json(
      success({
        unsignedTx,
        fromToken: token,
        toAddress: to,
        amount,
        tx: {
          to: unsignedTx.to,
          value: unsignedTx.value,
          data: unsignedTx.data,
          chainId: unsignedTx.chainId
        },
        token,
        network: 'base',
        note: 'Mock unsigned transfer tx. Sign locally before broadcast.',
        timestamp: new Date().toISOString(),
        estimatedGasFee: '0.0001 ETH',
        status: 'unsigned'
      })
    );
  } catch {
    res.status(400).json(errorResponse('failed to build unsigned transaction'));
  }
});

export default router;
