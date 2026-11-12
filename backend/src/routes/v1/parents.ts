import { Router } from 'express';
import * as parentService from '../../services/parentService';
import { authenticate, authorize, AuthRequest } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createParentSchema, idParamSchema, paginationQuery } from '../../validation/schemas';
import { asyncHandler } from '../../utils/asyncHandler';
import { ok, created } from '../../utils/response';

const router = Router();

router.get(
  '/',
  authenticate,
  authorize(['centre_manager', 'super_admin']),
  validate({ query: paginationQuery }),
  asyncHandler(async (req: AuthRequest, res) => {
    const parents = await parentService.listParents(
      req.user!,
      req.query.centreId as string | undefined
    );
    return ok(req, res, parents);
  })
);

router.post(
  '/',
  authenticate,
  authorize(['centre_manager', 'super_admin']),
  validate({ body: createParentSchema }),
  asyncHandler(async (req: AuthRequest, res) => {
    const parent = await parentService.createParent(req.user!, req.body);
    return created(req, res, parent);
  })
);

router.get(
  '/me/children',
  authenticate,
  authorize(['parent']),
  asyncHandler(async (req: AuthRequest, res) => {
    const children = await parentService.getMyChildren(req.user!);
    return ok(req, res, children);
  })
);

router.get(
  '/:id',
  authenticate,
  authorize(['centre_manager', 'super_admin']),
  validate({ params: idParamSchema }),
  asyncHandler(async (req: AuthRequest, res) => {
    const parent = await parentService.getParent(
      req.user!,
      String(req.params.id),
      req.query.centreId as string | undefined
    );
    return ok(req, res, parent);
  })
);

export default router;
