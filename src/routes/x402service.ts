import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { getNetworkInfo } from '../config';
import { issuedKeys } from '../middleware/apiKeyStore';
import { errorResponse } from '../types';
import type { Dashboard } from '../ui/dashboard';

/**
 * Generic x402-paywalled endpoint for testing payX402Service().
 *
 * Any path under /x402/* behaves as an x402 endpoint:
 * - Without X-PAYMENT header → returns 402 with payment requirements
 * - With X-PAYMENT header → accepts payment and returns mock data
 *
 * This lets developers test payX402Service() against the emulator
 * without needing a real x402 server.
 */
export function createX402ServiceRouter(dashboard?: Dashboard): Router {
  const router = Router();

  router.all('/*', (req, res) => {
    const net = getNetworkInfo();
    const resource = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

    // Check for X-PAYMENT header
    const paymentHeader = req.headers['x-payment'];
    if (typeof paymentHeader === 'string' && paymentHeader.length > 0) {
      // Payment provided — accept it and return mock data
      if (dashboard) {
        dashboard.logSkillCall('x402-svc', '', `paid ${req.method} ${req.path}`);
      }

      res.json({
        status: 'ok',
        data: {
          message: 'x402 service response (mock)',
          resource,
          requestId: randomBytes(16).toString('hex'),
          timestamp: new Date().toISOString(),
        },
        paidAmount: '10000',
        network: net.name,
      });
      return;
    }

    // Check for X-API-KEY header (bypass)
    const apiKey = req.headers['x-api-key'];
    if (typeof apiKey === 'string' && apiKey.length > 0) {
      if (!issuedKeys.has(apiKey)) {
        res.status(401).json(errorResponse('invalid api key'));
        return;
      }
      res.json({
        status: 'ok',
        data: {
          message: 'x402 service response (api key bypass)',
          resource,
          requestId: randomBytes(16).toString('hex'),
          timestamp: new Date().toISOString(),
        },
        paidAmount: '0',
        network: net.name,
      });
      return;
    }

    // No payment — return 402
    if (dashboard) {
      dashboard.logSkillCall('x402-svc', '', `402 → ${req.method} ${req.path}`);
    }

    res.status(402).json({
      x402Version: 1,
      accepts: [
        {
          scheme: 'exact',
          network: net.name,
          maxAmountRequired: '10000',
          resource,
          description: 'Generic x402 service endpoint (mock)',
          mimeType: 'application/json',
          payTo: `0x${randomBytes(20).toString('hex')}`,
          maxTimeoutSeconds: 900,
          asset: net.usdcAddress,
          extra: {
            name: 'USD Coin',
            version: '2',
          },
        },
      ],
    });
  });

  return router;
}
