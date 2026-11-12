import { Router } from 'express';
import { AuditLog } from '../../models/AuditLog';
import { authenticate, authorize, AuthRequest } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { ok } from '../../utils/response';
import { badRequest, forbidden } from '../../utils/errors';

const router = Router();

router.get(
  '/',
  authenticate,
  authorize(['super_admin', 'centre_manager']),
  asyncHandler(async (req: AuthRequest, res) => {
    let centreId: string | undefined;
    if (req.user!.role === 'super_admin') {
      centreId = req.query.centreId as string | undefined;
      if (!centreId) throw badRequest('centreId required');
    } else {
      if (!req.user!.centreId) throw forbidden('No centre assigned');
      centreId = String(req.user!.centreId);
    }

    const logs = await AuditLog.find({ centreId }).sort({ createdAt: -1 }).limit(100);
    return ok(req, res, logs);
  })
);

export default router;
