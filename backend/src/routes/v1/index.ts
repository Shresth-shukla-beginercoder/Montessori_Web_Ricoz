import { Router } from 'express';
import authRoutes from './auth';
import centreRoutes from './centres';
import childRoutes from './children';
import attendanceRoutes from './attendance';
import staffRoutes from './staff';
import feeRoutes from './fees';
import montessoriRoutes from './montessoriLogs';
import parentRoutes from './parents';
import notificationRoutes from './notifications';
import auditRoutes from './auditLogs';
import dashboardRoutes from './dashboard';

const router = Router();

router.get('/health', (_req, res) => {
  res.status(200).json({ success: true, data: { status: 'v1-api-ok' } });
});

router.use('/auth', authRoutes);
router.use('/centres', centreRoutes);
router.use('/children', childRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/staff', staffRoutes);
router.use('/fees', feeRoutes);
router.use('/montessori-logs', montessoriRoutes);
router.use('/parents', parentRoutes);
router.use('/notifications', notificationRoutes);
router.use('/audit-logs', auditRoutes);
router.use('/dashboard', dashboardRoutes);

export default router;
