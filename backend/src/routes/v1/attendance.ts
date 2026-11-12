import { Router } from 'express';
import * as attendanceService from '../../services/AttendanceService';
import { authenticate, authorize, AuthRequest } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createAttendanceSchema, paginationQuery } from '../../validation/schemas';
import { asyncHandler } from '../../utils/asyncHandler';
import { ok, created } from '../../utils/response';

const router = Router();

router.post(
  '/',
  authenticate,
  authorize(['teacher', 'centre_manager']),
  validate({ body: createAttendanceSchema }),
  asyncHandler(async (req: AuthRequest, res) => {
    const record = await attendanceService.logAttendance(req.user!, req.body);
    return created(req, res, record);
  })
);

router.get(
  '/',
  authenticate,
  authorize(['centre_manager', 'teacher', 'super_admin']),
  validate({ query: paginationQuery }),
  asyncHandler(async (req: AuthRequest, res) => {
    const records = await attendanceService.listAttendance(req.user!, {
      centreId: req.query.centreId as string | undefined,
      date: req.query.date as string | undefined,
      childId: req.query.childId as string | undefined,
    });
    return ok(req, res, records);
  })
);

export default router;
