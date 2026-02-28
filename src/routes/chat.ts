import { Router } from 'express';
import axios from 'axios';
import { loadConfig } from '../config';
import { errorResponse, success } from '../types';

const router = Router();

// Token symbols to detect in messages
const TOKEN_RE = /\b(ETH|BTC|SOL|USDC|MATIC|WETH|DAI|WBTC|CBETH)\b/i;
const SEND_RE = /\b(send|transfer|pay|move)\b/i;
const TRADE_RE = /\b(trade|swap|exchange|convert)\b/i;
const PRICE_RE = /\b(price|cost|worth|value|how much)\b/i;
const BALANCE_RE = /\b(balance|wallet|holdings|portfolio|how much do i have)\b/i;
const HELP_RE = /\b(help|what can you do|commands|skills)\b/i;

interface KeywordResponse {
  pattern: RegExp;
  reply: (msg: string, tokenMatch: string | null) => string;
}

const KEYWORD_RESPONSES: KeywordResponse[] = [
  {
    pattern: HELP_RE,
    reply: () =>
      'I can help with: checking prices, sending tokens, trading/swapping, checking balances, and general market analysis. Try asking about a specific token or action.',
  },
  {
    pattern: BALANCE_RE,
    reply: (_msg, token) =>
      token
        ? `To check your ${token} balance, use the balance skill with your wallet address. Your agent can call skills.balance(address) to get current holdings.`
        : 'Use the balance skill with your wallet address to check holdings. Your agent calls skills.balance(address).',
  },
  {
    pattern: SEND_RE,
    reply: (_msg, token) =>
      token
        ? `To send ${token}, use skills.send(toAddress, amount, "${token}"). Make sure you have sufficient balance and the recipient address is valid.`
        : 'To transfer tokens, use skills.send(toAddress, amount, token). Specify the recipient, amount, and token symbol.',
  },
  {
    pattern: TRADE_RE,
    reply: (_msg, token) =>
      token
        ? `To swap ${token}, use skills.trade(srcToken, dstToken, amount). The emulator simulates Uniswap V3 routing with a 0.3% fee.`
        : 'Use skills.trade(src, dst, amount) to swap between tokens. Set slippage (1-50%) for price tolerance.',
  },
  {
    pattern: PRICE_RE,
    reply: (_msg, token) =>
      token
        ? `Check the current ${token} price with skills.price("${token}"). Prices come from CoinGecko with a 60s cache.`
        : 'Use skills.price(token) to get current USD prices. Supported tokens include ETH, BTC, SOL, MATIC, and USDC.',
  },
];

const FALLBACK_RESPONSES = [
  'Market momentum is mixed; monitor ETH volume before entering.',
  'Signal shows mild upside. Consider splitting entries to reduce volatility risk.',
  'Current spread is tight. This is a reasonable point for a small position.',
  'Risk profile is elevated right now; waiting for confirmation may be better.',
  'Liquidity looks healthy. A conservative rebalance could be justified.',
  'Trend remains neutral. Hold and re-check after the next candle closes.',
  'Mean reversion setup detected. Keep slippage limits strict on execution.',
  'No strong edge detected right now. Avoid overtrading and preserve capital.',
];

function generateReply(message: string): string {
  const tokenMatch = message.match(TOKEN_RE);
  const token = tokenMatch ? tokenMatch[1].toUpperCase() : null;

  for (const { pattern, reply } of KEYWORD_RESPONSES) {
    if (pattern.test(message)) {
      return reply(message, token);
    }
  }

  // If a token is mentioned but no action keyword, give price advice
  if (token) {
    return `Regarding ${token}: the market is showing mixed signals. Use skills.price("${token}") for the latest price, and consider setting tight stop-losses if entering a position.`;
  }

  // Deterministic fallback based on message content
  const idx = message.length % FALLBACK_RESPONSES.length;
  return FALLBACK_RESPONSES[idx];
}

router.post('/', async (req, res) => {
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

  // If chatProxy is configured, forward to local LLM
  const config = loadConfig();
  if (config.chatProxy) {
    try {
      const proxyRes = await axios.post(
        config.chatProxy,
        {
          model: 'llama3',
          prompt: message,
          stream: false,
        },
        { timeout: 30_000 }
      );
      const reply = String(
        proxyRes.data?.response ?? proxyRes.data?.message?.content ?? proxyRes.data?.text ?? ''
      );
      if (reply) {
        res.json(success({ reply, response: reply, model: 'local-llm' }));
        return;
      }
    } catch {
      // Fall through to local response generation
    }
  }

  const reply = generateReply(message);
  res.json(success({ reply, response: reply, model: 'mock-contextual' }));
});

export default router;
