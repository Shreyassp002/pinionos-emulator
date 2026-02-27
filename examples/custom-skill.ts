import { createSkillServer } from 'pinion-os/server';
import axios from 'axios';

interface SkillRequest {
  body?: {
    token?: string;
  };
}

interface SkillResponse {
  json: (payload: unknown) => void;
}

const server = createSkillServer({
  payTo: '0x000000000000000000000000000000000000dEaD',
  network: 'base'
});

server.add({
  name: 'yieldRecs',
  description: 'Return a basic yield recommendation using live Binance ticker data.',
  endpoint: '/yield-recs',
  method: 'POST',
  price: '$0.01',
  handler: async (req: SkillRequest, res: SkillResponse) => {
    const token = (req.body?.token ?? 'ETH').toUpperCase();
    const symbol = `${token}USDT`;
    const ticker = await axios.get<{ price: string }>(
      `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`
    );

    res.json({
      data: {
        token,
        marketPrice: Number(ticker.data.price).toFixed(2),
        recommendation: 'Rotate 20% into stablecoins during high volatility.',
        confidence: 'medium'
      },
      mock: true
    });
  }
});

// Run this alongside the emulator to demo adding custom paywalled skills.
server.listen(4500);
console.log('Custom skill server listening on :4500');
