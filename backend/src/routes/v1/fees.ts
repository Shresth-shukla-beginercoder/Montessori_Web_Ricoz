import { Router } from 'express';
import * as feeService from '../../services/feeService';
import { authenticate, authorize, AuthRequest } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createFeeSchema, updateFeeSchema, idParamSchema, paginationQuery } from '../../validation/schemas';
import { asyncHandler } from '../../utils/asyncHandler';
import { ok, created } from '../../utils/response';

const router = Router();

router.get(
  '/',
  authenticate,
  authorize(['centre_manager', 'parent', 'super_admin']),
  validate({ query: paginationQuery }),
  asyncHandler(async (req: AuthRequest, res) => {
    const records = await feeService.listFees(req.user!, {
      centreId: typeof req.query.centreId === 'string' ? req.query.centreId : undefined,
      childId: typeof req.query.childId === 'string' ? req.query.childId : undefined,
    });
    return ok(req, res, records);
  })
);

router.post(
  '/',
  authenticate,
  authorize(['centre_manager', 'super_admin']),
  validate({ body: createFeeSchema }),
  asyncHandler(async (req: AuthRequest, res) => {
    const record = await feeService.createFee(req.user!, req.body);
    return created(req, res, record);
  })
);

router.patch(
  '/:id',
  authenticate,
  authorize(['centre_manager', 'super_admin']),
  validate({ params: idParamSchema, body: updateFeeSchema }),
  asyncHandler(async (req: AuthRequest, res) => {
    const record = await feeService.updateFee(req.user!, String(req.params.id), req.body);
    return ok(req, res, record);
  })
);

export default router;
