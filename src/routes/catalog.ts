import { Router } from 'express';
import { getNetworkInfo } from '../config';

const MOCK_PAY_TO = '0x000000000000000000000000000000000000dead';

const SKILLS = [
  { name: 'balance', path: '/balance/:address', method: 'GET', description: 'Get wallet balances' },
  { name: 'tx', path: '/tx/:hash', method: 'GET', description: 'Look up transaction details' },
  { name: 'price', path: '/price/:token', method: 'GET', description: 'Get token price in USD' },
  { name: 'wallet', path: '/wallet/generate', method: 'GET', description: 'Generate a new wallet' },
  { name: 'chat', path: '/chat', method: 'POST', description: 'Chat with Pinion AI agent' },
  { name: 'send', path: '/send', method: 'POST', description: 'Build a token transfer transaction' },
  { name: 'trade', path: '/trade', method: 'POST', description: 'Build a swap transaction' },
  { name: 'fund', path: '/fund/:address', method: 'GET', description: 'Get funding instructions' },
  { name: 'broadcast', path: '/broadcast', method: 'POST', description: 'Sign and broadcast a transaction' },
];

const catalogRouter = Router();

catalogRouter.get('/', (_req, res) => {
  const net = getNetworkInfo();
  res.json({
    skills: SKILLS.map((s) => ({
      ...s,
      price: '0.01',
      priceToken: 'USDC',
    })),
    payTo: MOCK_PAY_TO,
    network: net.name,
    mock: true,
  });
});

export default catalogRouter;
