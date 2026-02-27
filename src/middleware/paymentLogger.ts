import { NextFunction, Request, Response } from 'express';

export function paymentLogger(req: Request, _res: Response, next: NextFunction): void {
  if (req.path === '/health' || req.path === '/') {
    next();
    return;
  }

  const skill = req.path.split('/').filter(Boolean)[0] ?? 'unknown';
  console.log(`[MOCK PAYMENT] $0.01 for skill: ${skill}`);
  next();
}
