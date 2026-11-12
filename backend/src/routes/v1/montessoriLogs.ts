import { Router } from 'express';
import * as montessoriService from '../../services/montessoriService';
import { authenticate, authorize, AuthRequest } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createMontessoriSchema, paginationQuery } from '../../validation/schemas';
import { asyncHandler } from '../../utils/asyncHandler';
import { ok, created } from '../../utils/response';

const router = Router();

router.post(
  '/',
  authenticate,
  authorize(['teacher', 'centre_manager']),
  validate({ body: createMontessoriSchema }),
  asyncHandler(async (req: AuthRequest, res) => {
    const log = await montessoriService.createLog(req.user!, req.body);
    return created(req, res, log);
  })
);

router.get(
  '/',
  authenticate,
  authorize(['teacher', 'centre_manager', 'parent', 'super_admin']),
  validate({ query: paginationQuery }),
  asyncHandler(async (req: AuthRequest, res) => {
    const logs = await montessoriService.listLogs(req.user!, {
      centreId: req.query.centreId as string | undefined,
      childId: req.query.childId as string | undefined,
      area: req.query.area as string | undefined,
    });
    return ok(req, res, logs);
  })
);

export default router;
