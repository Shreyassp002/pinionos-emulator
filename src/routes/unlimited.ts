import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { success } from '../types';

const router = Router();
const issuedKeys = new Map<string, { issuedAt: number; address: string }>();

function issueKeyPayload() {
  const key = `pk_mock_${randomBytes(8).toString('hex')}`;
  const issuedAt = Date.now();
  const address = `0x${randomBytes(20).toString('hex')}`;
  issuedKeys.set(key, { issuedAt, address });

  return {
    key,
    type: 'unlimited',
    issuedAt: new Date(issuedAt).toISOString(),
    expiresAt: null,
    message: 'Unlimited access key issued (simulated)',
    apiKey: key,
    address,
    plan: 'unlimited',
    timestamp: new Date(issuedAt).toISOString()
  };
}

router.get('/', (_req, res) => {
  res.json(success(issueKeyPayload()));
});

// SDK compatibility: pinion-os currently uses POST /unlimited
router.post('/', (_req, res) => {
  res.json(success(issueKeyPayload()));
});

router.get('/verify/:key', (req, res) => {
  const key = String(req.params.key || '');
  const entry = issuedKeys.get(key);
  const valid = Boolean(entry);

  res.json(
    success({
      key,
      valid,
      type: 'unlimited',
      address: entry?.address,
      since: entry ? new Date(entry.issuedAt).toISOString() : undefined,
      plan: entry ? 'unlimited' : undefined
    })
  );
});

// SDK compatibility: pinion-os uses /unlimited/verify?key= and expects flat response
router.get('/verify', (req, res) => {
  const key = String(req.query.key ?? '');
  const entry = issuedKeys.get(key);
  const valid = Boolean(entry);

  res.json({
    valid,
    address: entry?.address,
    since: entry ? new Date(entry.issuedAt).toISOString() : undefined,
    plan: entry ? 'unlimited' : undefined,
    error: valid ? undefined : 'invalid api key'
  });
});

export default router;
