import { NextFunction, Request, Response } from 'express';

export function paymentLogger(req: Request, _res: Response, next: NextFunction): void {
  if (req.path === '/health' || req.path === '/') {
    next();
    return;
  }

  const parts = req.path.split('/').filter(Boolean);
  const skill = parts[0] ?? 'unknown';
  const param = parts[1] ?? '';
  console.log(`[MOCK PAYMENT] $0.01 USDC for skill: ${skill}(${param}) - simulated, not real`);
  next();
}
