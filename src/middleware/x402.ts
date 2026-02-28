import { NextFunction, Request, Response } from 'express';
import { randomBytes } from 'node:crypto';
import { getNetworkInfo, loadConfig } from '../config';
import { issuedKeys } from './apiKeyStore';
import { errorResponse } from '../types';
import type { Dashboard } from '../ui/dashboard';

// Default mock payee address
const DEFAULT_PAY_TO = `0x${randomBytes(20).toString('hex')}`;

// Default price: 10000 = $0.01 USDC (6 decimals)
const DEFAULT_PRICE = '10000';

/**
 * Build the 402 response body matching what the real PinionOS server returns.
 * The SDK's `parsePaymentRequirements()` expects `{ x402Version, accepts: [{ ... }] }`.
 */
function build402Body(resource: string, payTo: string, price: string) {
  const net = getNetworkInfo();
  return {
    x402Version: 1,
    accepts: [
      {
        scheme: 'exact',
        network: net.name,
        maxAmountRequired: price,
        resource,
        description: 'Pinion skill call',
        mimeType: 'application/json',
        payTo,
        maxTimeoutSeconds: 900,
        asset: net.usdcAddress,
        extra: {
          name: 'USD Coin',
          version: '2'
        }
      }
    ]
  };
}

/**
 * Validate the X-PAYMENT header structure (mock validation — no cryptographic verification).
 * Returns the decoded payload if structurally valid, null otherwise.
 */
function parsePaymentHeader(header: string): Record<string, unknown> | null {
  try {
    const decoded = JSON.parse(Buffer.from(header, 'base64').toString('utf-8'));
    // Minimal structural check: must have payload.signature and payload.authorization
    if (
      decoded &&
      typeof decoded === 'object' &&
      decoded.payload &&
      typeof decoded.payload.signature === 'string' &&
      decoded.payload.authorization &&
      typeof decoded.payload.authorization.from === 'string'
    ) {
      return decoded as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

// Routes that skip x402 (free endpoints, health checks, etc.)
const SKIP_PATHS = new Set(['/', '/health', '/reset']);
const SKIP_PREFIXES = ['/unlimited/verify', '/facilitator', '/x402/', '/recording'];

function shouldSkip(path: string, method: string): boolean {
  if (method === 'OPTIONS') return true;
  if (SKIP_PATHS.has(path)) return true;
  for (const prefix of SKIP_PREFIXES) {
    if (path.startsWith(prefix)) return true;
  }
  return false;
}

/**
 * x402 payment simulation middleware.
 * When x402Mode is enabled in config:
 * - Requests with X-API-KEY header pass through (unlimited key bypass)
 * - Requests with valid X-PAYMENT header pass through (paid)
 * - All other requests get HTTP 402 with payment requirements
 */
export function x402Middleware(dashboard?: Dashboard) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const config = loadConfig();

    // Skip if x402 mode is disabled
    if (!config.x402Mode) {
      next();
      return;
    }

    // Skip free/utility endpoints
    if (shouldSkip(req.path, req.method)) {
      next();
      return;
    }

    // X-API-KEY bypasses x402 only if key was issued by /unlimited
    const apiKey = req.headers['x-api-key'];
    if (typeof apiKey === 'string' && apiKey.length > 0) {
      if (!issuedKeys.has(apiKey)) {
        if (dashboard) {
          dashboard.logSkillCall('x402', '', `invalid api key (${apiKey.slice(0, 12)}...)`);
        }
        res.status(401).json(errorResponse('invalid api key'));
        return;
      }
      next();
      return;
    }

    // Check for X-PAYMENT header (paid request)
    const paymentHeader = req.headers['x-payment'];
    if (typeof paymentHeader === 'string' && paymentHeader.length > 0) {
      const decoded = parsePaymentHeader(paymentHeader);
      if (decoded) {
        const auth = (decoded.payload as Record<string, unknown>)?.authorization as Record<string, unknown> | undefined;
        const payer = auth?.from ?? 'unknown';
        if (dashboard) {
          dashboard.logSkillCall('x402', '', `payment accepted from ${String(payer).slice(0, 12)}...`);
        }
        next();
        return;
      }

      // Invalid payment header
      res.status(400).json({
        error: 'invalid X-PAYMENT header',
        message: 'Could not decode or validate payment payload'
      });
      return;
    }

    // No payment, no API key → return 402 with payment requirements
    const payTo = config.x402PayTo ?? DEFAULT_PAY_TO;
    const price = config.x402Price ?? DEFAULT_PRICE;
    const resource = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

    if (dashboard) {
      dashboard.logSkillCall('x402', '', `402 → ${req.method} ${req.path} (awaiting payment)`);
    }

    res.status(402).json(build402Body(resource, payTo, price));
  };
}
