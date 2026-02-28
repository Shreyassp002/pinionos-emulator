import { Router } from 'express';
import { getNetworkInfo } from '../config';
import type { Dashboard } from '../ui/dashboard';

/**
 * Mock facilitator endpoint.
 *
 * In production, the facilitator (https://facilitator.payai.network) verifies
 * x402 payment signatures against the USDC contract. This mock always returns
 * success, allowing developers to test custom skill servers locally without
 * hitting the real facilitator.
 *
 * POST /facilitator/verify — accepts any payment, returns success
 * GET  /facilitator/status — health check
 */
export function createFacilitatorRouter(dashboard?: Dashboard): Router {
  const router = Router();

  router.post('/verify', (req, res) => {
    const net = getNetworkInfo();
    const payment = req.body?.payment;
    const resource = req.body?.resource ?? 'unknown';

    if (dashboard) {
      dashboard.logSkillCall('facilitator', '', `verified payment for ${String(resource).slice(0, 40)}`);
    }

    res.json({
      success: true,
      network: net.name,
      chainId: net.chainId,
      resource,
      payer: payment?.payload?.authorization?.from ?? 'unknown',
      amount: payment?.payload?.authorization?.value ?? '10000',
      asset: net.usdcAddress,
      timestamp: new Date().toISOString(),
    });
  });

  router.get('/status', (_req, res) => {
    const net = getNetworkInfo();
    res.json({
      status: 'ok',
      mock: true,
      network: net.name,
      chainId: net.chainId,
      note: 'Mock facilitator — accepts all x402 payments without verification.',
    });
  });

  return router;
}
