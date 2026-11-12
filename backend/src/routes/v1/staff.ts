import { Router } from 'express';
import * as staffService from '../../services/staffService';
import { authenticate, authorize, AuthRequest } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createStaffSchema, idParamSchema, paginationQuery, assignChildrenSchema } from '../../validation/schemas';
import { asyncHandler } from '../../utils/asyncHandler';
import { ok, created } from '../../utils/response';

const router = Router();

router.get(
  '/',
  authenticate,
  authorize(['centre_manager', 'super_admin']),
  validate({ query: paginationQuery }),
  asyncHandler(async (req: AuthRequest, res) => {
    const staff = await staffService.listStaff(req.user!, req.query.centreId as string | undefined);
    return ok(req, res, staff);
  })
);

router.post(
  '/',
  authenticate,
  authorize(['centre_manager', 'super_admin']),
  validate({ body: createStaffSchema }),
  asyncHandler(async (req: AuthRequest, res) => {
    const staff = await staffService.createStaff(req.user!, req.body);
    return created(req, res, staff);
  })
);

router.get(
  '/:id',
  authenticate,
  authorize(['centre_manager', 'super_admin']),
  validate({ params: idParamSchema }),
  asyncHandler(async (req: AuthRequest, res) => {
    const staff = await staffService.getStaff(
      req.user!,
      String(req.params.id),
      req.query.centreId as string | undefined
    );
    return ok(req, res, staff);
  })
);

router.patch(
  '/:id/assignments',
  authenticate,
  authorize(['centre_manager', 'super_admin']),
  validate({ params: idParamSchema, body: assignChildrenSchema }),
  asyncHandler(async (req: AuthRequest, res) => {
    const staff = await staffService.assignChildren(
      req.user!,
      String(req.params.id),
      req.body.childIds,
      req.query.centreId as string | undefined
    );
    return ok(req, res, staff);
  })
);

export default router;
