import { Router } from 'express';
import * as authService from '../../services/authService';
import { authenticate, authorize, AuthRequest } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { loginSchema, registerSchema, changePasswordSchema } from '../../validation/schemas';
import { asyncHandler } from '../../utils/asyncHandler';
import { ok, created } from '../../utils/response';

const router = Router();

const isProd = process.env.NODE_ENV === 'production';
const ACCESS_COOKIE_MAX_AGE = 15 * 60 * 1000; // 15 min
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

// Access cookie: short-lived, sent on all API paths
const setAccessCookie = (res: any, accessToken: string) => {
  res.cookie('token', accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    maxAge: ACCESS_COOKIE_MAX_AGE,
    path: '/',
  });
};

// Refresh cookie: long-lived, scoped to auth routes only, stricter SameSite
const setRefreshCookie = (res: any, refreshToken: string) => {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    maxAge: REFRESH_COOKIE_MAX_AGE,
    path: '/api/v1/auth',
  });
};

const clearAuthCookies = (res: any) => {
  res.clearCookie('token', { path: '/' });
  res.clearCookie('refreshToken', { path: '/api/v1/auth' });
};

router.post(
  '/login',
  validate({ body: loginSchema }),
  asyncHandler(async (req, res) => {
    const result = await authService.login(req.body.email, req.body.password);
    setAccessCookie(res, result.accessToken);
    setRefreshCookie(res, result.refreshToken);
    return ok(req, res, { user: result.user });
  })
);

router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const raw = req.cookies?.refreshToken;
    if (!raw) {
      clearAuthCookies(res);
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Missing refresh token', requestId: (req as any).requestId },
      });
    }
    try {
      const result = await authService.refresh(raw);
      setAccessCookie(res, result.accessToken);
      setRefreshCookie(res, result.refreshToken);
      return ok(req, res, { user: result.user });
    } catch (err) {
      clearAuthCookies(res);
      throw err; // re-thrown to errorHandler → 401 envelope
    }
  })
);

router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const raw = req.cookies?.refreshToken;
    if (raw) {
      await authService.logout(raw); // revoke the refresh token
    }
    clearAuthCookies(res);
    return ok(req, res, { loggedOut: true });
  })
);

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    const user = await authService.getMe(req.user!.id);
    return ok(req, res, user);
  })
);

router.post(
  '/register',
  authenticate,
  authorize(['super_admin', 'centre_manager']),
  validate({ body: registerSchema }),
  asyncHandler(async (req: AuthRequest, res) => {
    const centreId =
      req.user!.role === 'centre_manager' ? req.user!.centreId : req.body.centreId;
    const user = await authService.registerUser({
      ...req.body,
      centreId,
      actorId: req.user!.id,
      actorRole: req.user!.role,
    });
    return created(req, res, user);
  })
);

router.post(
  '/change-password',
  authenticate,
  validate({ body: changePasswordSchema }),
  asyncHandler(async (req: AuthRequest, res) => {
    await authService.changePassword(
      req.user!.id,
      req.body.currentPassword,
      req.body.newPassword
    );
    return ok(req, res, { changed: true });
  })
);

export default router;
