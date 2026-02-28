import cors from 'cors';
import express from 'express';
import { loadConfig } from './config';
import { chaosMiddleware } from './middleware/chaos';
import { paymentLogger } from './middleware/paymentLogger';
import { recorderMiddleware, startRecording, stopRecording, isRecording } from './middleware/recorder';
import { x402Middleware } from './middleware/x402';
import { createPriceRouter } from './routes/price';
import { createWalletRouter } from './routes/wallet';
import balanceRouter from './routes/balance';
import broadcastRouter from './routes/broadcast';
import chatRouter from './routes/chat';
import { createFundRouter } from './routes/fund';
import { createSendRouter } from './routes/send';
import { createTradeRouter } from './routes/trade';
import { createFacilitatorRouter } from './routes/facilitator';
import txRouter from './routes/tx';
import unlimitedRouter from './routes/unlimited';
import { createX402ServiceRouter } from './routes/x402service';
import { initBalances, resetBalances } from './state/balances';
import { issuedKeys as apiKeyStore } from './middleware/apiKeyStore';
import { errorResponse, success } from './types';
import type { Dashboard } from './ui/dashboard';

export interface CreateAppOptions {
  dashboard?: Dashboard;
}

export function createApp(opts: CreateAppOptions = {}) {
  const dashboard = opts.dashboard;
  const noop: Dashboard = {
    logSkillCall() {},
    updatePrices() {},
    logError() {},
    setWalletInfo() {},
    destroy() {},
  };
  const db = dashboard ?? noop;

  const app = express();
  const config = loadConfig();

  initBalances();

  app.use(cors());
  app.use(express.json());

  // Request recording
  app.use(recorderMiddleware());
  if (config.recording) {
    startRecording();
  }

  // Chaos error injection
  app.use(chaosMiddleware(db));

  // Log X-API-KEY usage
  app.use((req, _res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (typeof apiKey === 'string' && apiKey.length > 0) {
      const entry = apiKeyStore.get(apiKey);
      const label = entry ? `✓ key valid (${apiKey.slice(0, 12)}...)` : `✗ key unknown (${apiKey.slice(0, 12)}...)`;
      db.logSkillCall('x-api-key', '', label);
    }
    next();
  });

  app.use(paymentLogger(db));
  app.use(x402Middleware(db));

  app.get('/', (_req, res) => {
    res.json({ status: 'ok', emulator: true });
  });

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', emulator: true, port: config.port });
  });

  app.use('/price', createPriceRouter(db));
  app.use('/wallet', createWalletRouter(db));
  app.use('/balance', balanceRouter);
  app.use('/tx', txRouter);
  app.use('/send', createSendRouter(db));
  app.use('/trade', createTradeRouter(db));
  app.use('/fund', createFundRouter(db));
  app.use('/chat', chatRouter);
  app.use('/unlimited', unlimitedRouter);
  app.use('/broadcast', broadcastRouter);
  app.use('/facilitator', createFacilitatorRouter(db));
  app.use('/x402', createX402ServiceRouter(db));

  app.post('/reset', (_req, res) => {
    resetBalances();
    apiKeyStore.clear();
    db.logSkillCall('SYSTEM', '', 'State reset to config defaults');
    res.json(success({ message: 'All balances and API keys reset to defaults' }));
  });

  app.post('/recording/start', (_req, res) => {
    startRecording();
    db.logSkillCall('SYSTEM', '', 'Request recording started');
    res.json(success({ recording: true }));
  });

  app.post('/recording/stop', (_req, res) => {
    stopRecording();
    db.logSkillCall('SYSTEM', '', 'Request recording stopped');
    res.json(success({ recording: false }));
  });

  app.get('/recording/status', (_req, res) => {
    res.json(success({ recording: isRecording() }));
  });

  app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) {
      next(err);
      return;
    }

    if (err instanceof SyntaxError) {
      res.status(400).json(errorResponse('invalid json body'));
      return;
    }

    db.logError(`internal emulator error: ${String((err as Error)?.message ?? err)}`);
    res.status(500).json(errorResponse('internal emulator error'));
  });

  app.use((_req: express.Request, res: express.Response) => {
    res.status(404).json(errorResponse('route not found'));
  });

  return { app, config };
}
