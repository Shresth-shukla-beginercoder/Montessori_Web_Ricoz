"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePassword = exports.getMe = exports.registerUser = exports.logout = exports.refresh = exports.login = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const RefreshToken_1 = require("../models/RefreshToken");
const env_1 = require("../config/env");
const errors_1 = require("../utils/errors");
const auditService_1 = require("./auditService");
const crypto_1 = require("crypto");
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days in seconds
const generateTokens = async (user) => {
    const payload = {
        id: String(user._id),
        role: user.role,
        centreId: user.centreId ? String(user.centreId) : undefined,
        email: user.email,
    };
    const accessToken = jsonwebtoken_1.default.sign(payload, env_1.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
    const refreshTokenRaw = (0, crypto_1.randomBytes)(40).toString('hex');
    const refreshTokenHash = (0, crypto_1.createHash)('sha256').update(refreshTokenRaw).digest('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL * 1000);
    await RefreshToken_1.RefreshToken.create({
        userId: user._id,
        tokenHash: refreshTokenHash,
        expiresAt,
    });
    return { accessToken, refreshToken: refreshTokenRaw };
};
const login = async (email, password) => {
    const user = await User_1.User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !(await bcryptjs_1.default.compare(password, user.passwordHash))) {
        throw (0, errors_1.unauthorized)('Invalid credentials');
    }
    const { accessToken, refreshToken } = await generateTokens(user);
    if (user.centreId) {
        await (0, auditService_1.writeAudit)({
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
exports.login = login;
const refresh = async (tokenRaw) => {
    const tokenHash = (0, crypto_1.createHash)('sha256').update(tokenRaw).digest('hex');
    const tokenDoc = await RefreshToken_1.RefreshToken.findOne({ tokenHash });
    if (!tokenDoc) {
        throw (0, errors_1.unauthorized)('Invalid or expired refresh token');
    }
    if (tokenDoc.revoked) {
        // Reuse of a rotated/revoked refresh token: revoke ALL of this user's refresh tokens
        await RefreshToken_1.RefreshToken.updateMany({ userId: tokenDoc.userId, revoked: false }, { $set: { revoked: true } });
        throw (0, errors_1.unauthorized)('Refresh token reuse detected; all sessions revoked');
    }
    if (tokenDoc.expiresAt <= new Date()) {
        tokenDoc.revoked = true;
        await tokenDoc.save();
        throw (0, errors_1.unauthorized)('Invalid or expired refresh token');
    }
    // Rotate: revoke the presented token, issue a fresh pair
    tokenDoc.revoked = true;
    await tokenDoc.save();
    const user = await User_1.User.findById(tokenDoc.userId);
    if (!user)
        throw (0, errors_1.notFound)('User not found');
    const { accessToken, refreshToken: newRefreshToken } = await generateTokens(user);
    // Opportunistic cleanup of expired tokens for this user
    await RefreshToken_1.RefreshToken.deleteMany({ userId: user._id, expiresAt: { $lt: new Date() }, revoked: true });
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
exports.refresh = refresh;
const logout = async (tokenRaw) => {
    const tokenHash = (0, crypto_1.createHash)('sha256').update(tokenRaw).digest('hex');
    await RefreshToken_1.RefreshToken.updateOne({ tokenHash }, { $set: { revoked: true } });
};
exports.logout = logout;
const registerUser = async (input) => {
    if (input.actorRole !== 'super_admin' && input.actorRole !== 'centre_manager') {
        throw (0, errors_1.unauthorized)('Not allowed to register users');
    }
    if (input.actorRole === 'centre_manager' && input.role === 'super_admin') {
        throw (0, errors_1.badRequest)('Managers cannot create super_admin');
    }
    if (input.role !== 'super_admin' && !input.centreId) {
        throw (0, errors_1.badRequest)('centreId is required for this role');
    }
    const existing = await User_1.User.findOne({ email: input.email.toLowerCase().trim() });
    if (existing)
        throw (0, errors_1.badRequest)('Email already registered');
    const passwordHash = await bcryptjs_1.default.hash(input.password, 10);
    const user = await User_1.User.create({
        email: input.email.toLowerCase().trim(),
        passwordHash,
        name: input.name,
        role: input.role,
        centreId: input.centreId,
    });
    await (0, auditService_1.writeAudit)({
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
exports.registerUser = registerUser;
const getMe = async (userId) => {
    const user = await User_1.User.findById(userId).select('-passwordHash');
    if (!user)
        throw (0, errors_1.notFound)('User not found');
    return {
        id: String(user._id),
        email: user.email,
        name: user.name,
        role: user.role,
        centreId: user.centreId ? String(user.centreId) : undefined,
    };
};
exports.getMe = getMe;
const changePassword = async (userId, currentPassword, newPassword) => {
    const user = await User_1.User.findById(userId);
    if (!user)
        throw (0, errors_1.notFound)('User not found');
    if (!(await bcryptjs_1.default.compare(currentPassword, user.passwordHash))) {
        throw (0, errors_1.unauthorized)('Current password is incorrect');
    }
    user.passwordHash = await bcryptjs_1.default.hash(newPassword, 10);
    await user.save();
    return { ok: true };
};
exports.changePassword = changePassword;
