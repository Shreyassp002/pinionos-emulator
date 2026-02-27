import cors from 'cors';
import express from 'express';
import { loadConfig } from './config';
import { paymentLogger } from './middleware/paymentLogger';
import balanceRouter from './routes/balance';
import broadcastRouter from './routes/broadcast';
import chatRouter from './routes/chat';
import fundRouter from './routes/fund';
import priceRouter from './routes/price';
import sendRouter from './routes/send';
import tradeRouter from './routes/trade';
import txRouter from './routes/tx';
import unlimitedRouter from './routes/unlimited';
import walletRouter from './routes/wallet';
import { errorResponse } from './types';

const app = express();
const config = loadConfig();

app.use(cors());
app.use(express.json());
app.use(paymentLogger);

app.get('/', (_req, res) => {
  res.json({ status: 'ok', emulator: true });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', emulator: true });
});

app.use('/price', priceRouter);
app.use('/balance', balanceRouter);
app.use('/wallet', walletRouter);
app.use('/tx', txRouter);
app.use('/send', sendRouter);
app.use('/trade', tradeRouter);
app.use('/fund', fundRouter);
app.use('/chat', chatRouter);
app.use('/unlimited', unlimitedRouter);
app.use('/broadcast', broadcastRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof SyntaxError) {
    res.status(400).json(errorResponse('invalid json body'));
    return;
  }

  console.error('[EMULATOR ERROR]', err);
  res.status(500).json(errorResponse('internal emulator error'));
});

app.use((_req, res) => {
  res.status(404).json(errorResponse('route not found'));
});

app.listen(config.port, () => {
  console.log(`PinionOS emulator running on http://localhost:${config.port}`);
});
