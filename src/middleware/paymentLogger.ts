import { NextFunction, Request, Response } from 'express';
import type { Dashboard, SkillLogMeta } from '../ui/dashboard';

function summarizeResult(skill: string, payload: unknown, statusCode: number): string {
  if (statusCode >= 400) {
    const body = payload as Record<string, unknown> | undefined;
    const errorMsg = typeof body?.error === 'string' ? body.error : `HTTP ${statusCode}`;
    return `ERROR: ${errorMsg.slice(0, 50)}`;
  }

  if (!payload || typeof payload !== 'object') {
    return 'ok';
  }

  const body = payload as Record<string, unknown>;
  const data = (body.data as Record<string, unknown> | undefined) ?? body;
  const balances = (data.balances as Record<string, unknown> | undefined) ?? {};

  switch (skill) {
    case 'price':
      return `$${String(data.priceUSD ?? data.usd ?? 'n/a')}`;
    case 'balance':
      return `ETH ${String(data.ETH ?? balances.ETH ?? 'n/a')}  USDC ${String(data.USDC ?? balances.USDC ?? 'n/a')}`;
    case 'trade': {
      const toAmt = String(data.toAmount ?? data.outputAmount ?? 'n/a');
      const dst = String(data.dstToken ?? data.toToken ?? '');
      return `${toAmt} ${dst}`.trim();
    }
    case 'wallet':
      return typeof data.address === 'string' ? `${(data.address as string).slice(0, 10)}...` : 'wallet generated';
    case 'chat':
      return 'mock reply';
    case 'send':
      return `${String(data.amount ?? 'n/a')} ${String(data.token ?? '')}`.trim();
    case 'tx':
      return `confirmed ${String(data.hash ?? '').slice(0, 10)}...`;
    case 'fund':
      return `deposit: ${String((data.depositAddress as string | undefined)?.slice(0, 10) ?? 'n/a')}...`;
    case 'broadcast':
      return `tx ${String(data.txHash ?? data.hash ?? '').slice(0, 10)}...`;
    case 'unlimited':
      if (typeof data.valid === 'boolean') {
        return `valid=${String(data.valid)}`;
      }
      return `key ${String(data.key ?? data.apiKey ?? '').slice(0, 14)}...`;
    default:
      return typeof data.status === 'string' ? data.status : 'ok';
  }
}

export function paymentLogger(dashboard?: Dashboard) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip health checks and CORS preflight
    if (req.path === '/health' || req.path === '/' || req.method === 'OPTIONS') {
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
      const statusCode = res.statusCode;
      const result = summarizeResult(skill, responsePayload, statusCode);
      const meta: SkillLogMeta = {
        method: req.method,
        path: req.originalUrl,
        body: req.body,
        response: responsePayload,
        statusCode
      };

      if (dashboard) {
        dashboard.logSkillCall(skill, param, result, meta);
        return;
      }

      const statusTag = statusCode >= 400 ? ` [${statusCode}]` : '';
      console.log(`[MOCK PAYMENT] $0.01 USDC  ${req.method} ${skill}(${param})${statusTag} → ${result}`);
    });

    next();
  };
}
