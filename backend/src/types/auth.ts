import { Request } from 'express';

export type UserRole = 'super_admin' | 'centre_manager' | 'teacher' | 'parent';

export interface JwtPayload {
  id: string;
  role: UserRole;
  centreId?: string;
  email?: string;
}

export interface AuthUser extends JwtPayload {}

export interface AuthRequest extends Request {
  user?: AuthUser;
}
