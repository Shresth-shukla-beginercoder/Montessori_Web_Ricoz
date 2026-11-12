import { Router } from 'express';
import * as childService from '../../services/childService';
import { authenticate, authorize, AuthRequest } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { z } from 'zod';
import { idParamSchema } from '../../validation/schemas';
import { asyncHandler } from '../../utils/asyncHandler';
import { ok, created } from '../../utils/response';

const router = Router();

const bodySchema = z.object({
  name: z.string().min(1),
  dob: z.string().or(z.coerce.date()),
  parentIds: z.array(z.string()).optional(),
  centreId: z.string().optional(),
  status: z.enum(['active', 'inactive', 'withdrawn']).optional(),
});

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  dob: z.string().optional(),
  parentIds: z.array(z.string()).optional(),
  status: z.enum(['active', 'inactive', 'withdrawn']).optional(),
});

router.post(
  '/',
  authenticate,
  authorize(['centre_manager', 'super_admin']),
  validate({ body: bodySchema }),
  asyncHandler(async (req: AuthRequest, res) => {
    const child = await childService.createChild(req.user as any, {
      name: req.body.name,
      dob: String(req.body.dob),
      parentIds: req.body.parentIds,
      status: req.body.status,
      centreId: req.body.centreId,
    } as any);
    return created(req, res, child);
  })
);

router.get(
  '/',
  authenticate,
  authorize(['centre_manager', 'teacher', 'parent', 'super_admin']),
  asyncHandler(async (req: AuthRequest, res) => {
    const result = await childService.listChildren(
      req.user as any,
      {
        centreId: typeof req.query.centreId === 'string' ? req.query.centreId : undefined,
        status: req.query.status as string | undefined,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      },
      req.user!.role === 'parent' ? req.user!.id : undefined
    );
    return ok(req, res, result.items, 200, {
      page: result.page,
      limit: result.limit,
      total: result.total,
    });
  })
);

router.get(
  '/:id',
  authenticate,
  authorize(['centre_manager', 'teacher', 'parent', 'super_admin']),
  validate({ params: idParamSchema }),
  asyncHandler(async (req: AuthRequest, res) => {
    const child = await childService.getChild(
      req.user as any,
      String(req.params.id),
      typeof req.query.centreId === 'string' ? req.query.centreId : undefined,
      req.user!.role === 'parent' ? req.user!.id : undefined
    );
    return ok(req, res, child);
  })
);

router.patch(
  '/:id',
  authenticate,
  authorize(['centre_manager', 'super_admin']),
  validate({ params: idParamSchema, body: patchSchema }),
  asyncHandler(async (req: AuthRequest, res) => {
    const child = await childService.updateChild(req.user as any, String(req.params.id), {
      name: req.body.name,
      dob: req.body.dob ? String(req.body.dob) : undefined,
      parentIds: Array.isArray(req.body.parentIds) ? req.body.parentIds : undefined,
      status: req.body.status,
    } as any);
    return ok(req, res, child);
  })
);

router.delete(
  '/:id',
  authenticate,
  authorize(['centre_manager', 'super_admin']),
  validate({ params: idParamSchema }),
  asyncHandler(async (req: AuthRequest, res) => {
    await childService.deleteChild(req.user as any, String(req.params.id));
    return res.status(204).send();
  })
);

export default router;
