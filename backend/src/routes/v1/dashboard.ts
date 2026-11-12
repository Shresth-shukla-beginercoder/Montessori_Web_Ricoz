import { Router } from 'express';
import * as dashboardService from '../../services/dashboardService';
import { authenticate, authorize, AuthRequest } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { ok } from '../../utils/response';

const router = Router();

router.get(
  '/centre',
  authenticate,
  authorize(['centre_manager', 'teacher', 'super_admin']),
  asyncHandler(async (req: AuthRequest, res) => {
    const data = await dashboardService.getCentreDashboard(
      req.user!,
      req.query.centreId as string | undefined
    );
    return ok(req, res, data);
  })
);

router.get(
  '/hq',
  authenticate,
  authorize(['super_admin']),
  asyncHandler(async (req: AuthRequest, res) => {
    const data = await dashboardService.getHqDashboard(req.user!);
    return ok(req, res, data);
  })
);

export default router;
