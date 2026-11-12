import { Response, Request } from 'express';

export const ok = (req: Request, res: Response, data: unknown, status = 200, meta?: Record<string, unknown>) => {
  return res.status(status).json({
    success: true,
    data,
    meta: {
      requestId: req.headers['x-request-id'] || 'n/a',
      ...meta,
    },
  });
};

export const created = (req: Request, res: Response, data: unknown, meta?: Record<string, unknown>) =>
  ok(req, res, data, 201, meta);
