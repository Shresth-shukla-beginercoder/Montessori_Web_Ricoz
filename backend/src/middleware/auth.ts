import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthRequest, JwtPayload } from '../types/auth';

export type { AuthRequest };

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.cookies?.token as string | undefined;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'No token provided' },
    });
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = {
      id: decoded.id,
      role: decoded.role,
      centreId: decoded.centreId,
      email: decoded.email,
    };
    next();
  } catch {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid token' },
    });
  }
};

export const authorize = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied' },
      });
    }
    next();
  };
};

export const requireCentre = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role === 'super_admin') {
    return next();
  }
  if (!req.user?.centreId) {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Centre assignment required' },
    });
  }
  next();
};
