import { Router } from 'express';
import * as centreService from '../../services/CentreService';
import { authenticate, authorize, AuthRequest } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createCentreSchema, updateCentreSchema, idParamSchema } from '../../validation/schemas';
import { asyncHandler } from '../../utils/asyncHandler';
import { ok, created } from '../../utils/response';

const router = Router();

router.get(
  '/',
  authenticate,
  authorize(['super_admin', 'centre_manager']),
  asyncHandler(async (req: AuthRequest, res) => {
    const centres = await centreService.listCentres(req.user!);
    return ok(req, res, centres);
  })
);

router.post(
  '/',
  authenticate,
  authorize(['super_admin']),
  validate({ body: createCentreSchema }),
  asyncHandler(async (req: AuthRequest, res) => {
    const centre = await centreService.createCentre(req.user!, req.body);
    return created(req, res, centre);
  })
);

router.get(
  '/:id',
  authenticate,
  authorize(['super_admin', 'centre_manager']),
  validate({ params: idParamSchema }),
  asyncHandler(async (req: AuthRequest, res) => {
    const centre = await centreService.getCentre(req.user!, String(req.params.id));
    return ok(req, res, centre);
  })
);

router.patch(
  '/:id',
  authenticate,
  authorize(['super_admin', 'centre_manager']),
  validate({ params: idParamSchema, body: updateCentreSchema }),
  asyncHandler(async (req: AuthRequest, res) => {
    const centre = await centreService.updateCentre(req.user!, String(req.params.id), req.body);
    return ok(req, res, centre);
  })
);

export default router;
