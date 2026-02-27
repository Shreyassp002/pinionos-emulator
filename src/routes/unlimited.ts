import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { success } from '../types';

const router = Router();
const issuedKeys = new Map<string, number>();

router.get('/', (_req, res) => {
  const key = `pk_mock_${randomBytes(8).toString('hex')}`;
  const issuedAt = Date.now();
  issuedKeys.set(key, issuedAt);

  res.json(
    success({
      key,
      type: 'unlimited',
      issuedAt: new Date(issuedAt).toISOString(),
      expiresAt: null
    })
  );
});

router.get('/verify/:key', (req, res) => {
  const key = String(req.params.key || '');
  const valid = issuedKeys.has(key);

  res.json(
    success({
      key,
      valid,
      type: 'unlimited'
    })
  );
});

export default router;
