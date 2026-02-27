import { Router } from 'express';
import { errorResponse, success } from '../types';

const router = Router();

const responses = [
  'Market momentum is mixed; monitor ETH volume before entering.',
  'Signal shows mild upside. Consider splitting entries to reduce volatility risk.',
  'Current spread is tight. This is a reasonable point for a small position.',
  'Risk profile is elevated right now; waiting for confirmation may be better.',
  'Liquidity looks healthy. A conservative rebalance could be justified.',
  'Trend remains neutral. Hold and re-check after the next candle closes.',
  'Mean reversion setup detected. Keep slippage limits strict on execution.',
  'No strong edge detected right now. Avoid overtrading and preserve capital.'
];

router.post('/', (req, res) => {
  const messages = Array.isArray(req.body?.messages) ? req.body.messages : null;
  const lastMessageFromHistory =
    messages && messages.length > 0
      ? String(messages[messages.length - 1]?.content ?? '')
      : '';
  const message = String(req.body?.message ?? lastMessageFromHistory);

  if (!message) {
    res.status(400).json(errorResponse('message is required'));
    return;
  }

  const idx = message.length % responses.length;
  res.json(success({ reply: responses[idx], response: responses[idx], model: 'mock-claude' }));
});

export default router;
