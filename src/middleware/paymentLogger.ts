import { NextFunction, Request, Response } from 'express';
import type { Dashboard, SkillLogMeta } from '../ui/dashboard';

function summarizeResult(skill: string, payload: unknown): string {
  if (!payload || typeof payload !== 'object') {
    return 'ok';
  }

  const body = payload as Record<string, unknown>;
  const data = (body.data as Record<string, unknown> | undefined) ?? body;
  const balances = (data.balances as Record<string, unknown> | undefined) ?? {};
  const currentBalance = (data.currentBalance as Record<string, unknown> | undefined) ?? {};

  switch (skill) {
    case 'price':
      return `$${String(data.usd ?? data.priceUSD ?? 'n/a')}`;
    case 'balance':
      return `${String(data.ETH ?? balances.ETH ?? 'n/a')} ETH`;
    case 'trade':
      return `${String(data.toAmount ?? data.outputAmount ?? 'n/a')} ${String(data.toToken ?? '')}`.trim();
    case 'wallet':
      return String(data.address ?? 'wallet generated');
    case 'chat':
      return 'mock reply';
    case 'send':
      return `${String(data.amount ?? 'n/a')} ${String(data.token ?? data.fromToken ?? '')}`.trim();
    case 'tx':
      return String(data.hash ?? 'tx lookup');
    case 'fund':
      return `${String(currentBalance.ETH ?? balances.ETH ?? '0')} ETH`;
    case 'broadcast':
      return String(data.txHash ?? data.hash ?? 'broadcasted');
    case 'unlimited':
      if (typeof data.valid === 'boolean') {
        return `valid=${data.valid}`;
      }
      return String(data.key ?? data.apiKey ?? 'key issued');
    default:
      return typeof data.status === 'string' ? data.status : 'ok';
  }
}

export function paymentLogger(dashboard?: Dashboard) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.path === '/health' || req.path === '/') {
      next();
      return;
    }

    const parts = req.path.split('/').filter(Boolean);
    const skill = parts[0] ?? 'unknown';
    const param = parts[1] ?? '';

    let responsePayload: unknown;
    const originalJson = res.json.bind(res);
    res.json = ((body: unknown) => {
      responsePayload = body;
      return originalJson(body);
    }) as Response['json'];

    res.on('finish', () => {
      const result = summarizeResult(skill, responsePayload);
      const meta: SkillLogMeta = {
        method: req.method,
        path: req.originalUrl,
        body: req.body,
        response: responsePayload
      };

      if (dashboard) {
        dashboard.logSkillCall(skill, param, result, meta);
        return;
      }

      console.log(`[MOCK PAYMENT] $0.01 USDC for skill: ${skill}(${param}) - simulated, not real`);
    });

    next();
  };
}
