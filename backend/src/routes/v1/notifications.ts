import { Router } from 'express';
import * as notificationService from '../../services/notificationService';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { idParamSchema } from '../../validation/schemas';
import { asyncHandler } from '../../utils/asyncHandler';
import { ok } from '../../utils/response';

const router = Router();

router.get(
  '/',
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    const notes = await notificationService.listForUser(req.user!.id, req.user!.centreId);
    return ok(req, res, notes);
  })
);

router.patch(
  '/:id/read',
  authenticate,
  validate({ params: idParamSchema }),
  asyncHandler(async (req: AuthRequest, res) => {
    const note = await notificationService.markRead(String(req.params.id), req.user!.id);
    return ok(req, res, note);
  })
);

export default router;
