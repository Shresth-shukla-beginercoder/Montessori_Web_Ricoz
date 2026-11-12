import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { RefreshToken } from '../models/RefreshToken';
import { env } from '../config/env';
import { unauthorized, badRequest, notFound } from '../utils/errors';
import { UserRole } from '../types/auth';
import { writeAudit } from './auditService';
import { randomBytes, createHash } from 'crypto';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

const generateTokens = async (user: any) => {
  const payload = {
    id: String(user._id),
    role: user.role,
    centreId: user.centreId ? String(user.centreId) : undefined,
    email: user.email,
  };

  const accessToken = jwt.sign(payload, env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });

  const refreshTokenRaw = randomBytes(40).toString('hex');
  const refreshTokenHash = createHash('sha256').update(refreshTokenRaw).digest('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL * 1000);

  await RefreshToken.create({
    userId: user._id,
    tokenHash: refreshTokenHash,
    expiresAt,
  });

  return { accessToken, refreshToken: refreshTokenRaw };
};

export const login = async (email: string, password: string) => {
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw unauthorized('Invalid credentials');
  }

  const { accessToken, refreshToken } = await generateTokens(user);

  if (user.centreId) {
    await writeAudit({
      centreId: String(user.centreId),
      userId: String(user._id),
      action: 'LOGIN',
      resourceType: 'User',
      resourceId: String(user._id),
    });
  }

  return {
    accessToken,
    refreshToken,
    user: {
      id: String(user._id),
      email: user.email,
      name: user.name,
      role: user.role,
      centreId: user.centreId ? String(user.centreId) : undefined,
    },
  };
};

export const refresh = async (tokenRaw: string) => {
  const tokenHash = createHash('sha256').update(tokenRaw).digest('hex');
  const tokenDoc = await RefreshToken.findOne({ tokenHash });

  if (!tokenDoc) {
    throw unauthorized('Invalid or expired refresh token');
  }

  if (tokenDoc.revoked) {
    // Reuse of a rotated/revoked refresh token: revoke ALL of this user's refresh tokens
    await RefreshToken.updateMany({ userId: tokenDoc.userId, revoked: false }, { $set: { revoked: true } });
    throw unauthorized('Refresh token reuse detected; all sessions revoked');
  }

  if (tokenDoc.expiresAt <= new Date()) {
    tokenDoc.revoked = true;
    await tokenDoc.save();
    throw unauthorized('Invalid or expired refresh token');
  }

  // Rotate: revoke the presented token, issue a fresh pair
  tokenDoc.revoked = true;
  await tokenDoc.save();

  const user = await User.findById(tokenDoc.userId);
  if (!user) throw notFound('User not found');

  const { accessToken, refreshToken: newRefreshToken } = await generateTokens(user);
  // Opportunistic cleanup of expired tokens for this user
  await RefreshToken.deleteMany({ userId: user._id, expiresAt: { $lt: new Date() }, revoked: true });

  return {
    accessToken,
    refreshToken: newRefreshToken,
    user: {
      id: String(user._id),
      email: user.email,
      name: user.name,
      role: user.role,
      centreId: user.centreId ? String(user.centreId) : undefined,
    },
  };
};

export const logout = async (tokenRaw: string) => {
  const tokenHash = createHash('sha256').update(tokenRaw).digest('hex');
  await RefreshToken.updateOne({ tokenHash }, { $set: { revoked: true } });
};

export const registerUser = async (input: {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  centreId?: string;
  actorId: string;
  actorRole: UserRole;
}) => {
  if (input.actorRole !== 'super_admin' && input.actorRole !== 'centre_manager') {
    throw unauthorized('Not allowed to register users');
  }
  if (input.actorRole === 'centre_manager' && input.role === 'super_admin') {
    throw badRequest('Managers cannot create super_admin');
  }
  if (input.role !== 'super_admin' && !input.centreId) {
    throw badRequest('centreId is required for this role');
  }

  const existing = await User.findOne({ email: input.email.toLowerCase().trim() });
  if (existing) throw badRequest('Email already registered');

  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await User.create({
    email: input.email.toLowerCase().trim(),
    passwordHash,
    name: input.name,
    role: input.role,
    centreId: input.centreId,
  });

  await writeAudit({
    centreId: input.centreId,
    userId: input.actorId,
    action: 'CREATE',
    resourceType: 'User',
    resourceId: String(user._id),
  });

  return {
    id: String(user._id),
    email: user.email,
    name: user.name,
    role: user.role,
    centreId: user.centreId ? String(user.centreId) : undefined,
  };
};

export const getMe = async (userId: string) => {
  const user = await User.findById(userId).select('-passwordHash');
  if (!user) throw notFound('User not found');
  return {
    id: String(user._id),
    email: user.email,
    name: user.name,
    role: user.role,
    centreId: user.centreId ? String(user.centreId) : undefined,
  };
};

export const changePassword = async (userId: string, currentPassword: string, newPassword: string) => {
  const user = await User.findById(userId);
  if (!user) throw notFound('User not found');
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw unauthorized('Current password is incorrect');
  }
  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();
  return { ok: true };
};
