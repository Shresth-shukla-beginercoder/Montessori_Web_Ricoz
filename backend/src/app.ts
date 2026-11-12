import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import mongoose from 'mongoose';
import logger from './utils/logger';
import v1Routes from './routes/v1';
import { errorHandler } from './middleware/errorMiddleware';
import { requestId } from './middleware/requestId';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(requestId);
app.use(pinoHttp({ logger }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'TOO_MANY_REQUESTS', message: 'Rate limit exceeded' },
  },
});

app.use('/api/v1/auth', authLimiter);

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ success: true, data: { status: 'ok' } });
});

app.get('/ready', (_req: Request, res: Response) => {
  const ready = mongoose.connection.readyState === 1;
  if (!ready) {
    return res.status(503).json({
      success: false,
      error: { code: 'NOT_READY', message: 'Database not connected' },
    });
  }
  return res.status(200).json({ success: true, data: { status: 'ready' } });
});

app.use('/api/v1', v1Routes);

// Unknown routes: respond with the standard 404 envelope instead of Express's HTML 404.
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Route not found' },
  });
});

app.use(errorHandler);

export default app;
