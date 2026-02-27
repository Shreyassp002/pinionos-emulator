import { createSkillServer } from 'pinion-os/server';

const server = createSkillServer({
  payTo: '0x000000000000000000000000000000000000dEaD',
  network: 'base'
});

server.add({
  name: 'yieldRecs',
  price: 0.01,
  endpoint: '/yield-recs',
  handler: async (req: any, res: any) => {
    res.json({
      data: {
        recommendation: 'Rotate 20% into stablecoins during high volatility.',
        confidence: 'medium'
      },
      mock: true
    });
  }
});

server.listen(4500, () => {
  console.log('Custom skill server listening on :4500');
});
