"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authService = __importStar(require("../../services/authService"));
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const schemas_1 = require("../../validation/schemas");
const asyncHandler_1 = require("../../utils/asyncHandler");
const response_1 = require("../../utils/response");
const router = (0, express_1.Router)();
const isProd = process.env.NODE_ENV === 'production';
const ACCESS_COOKIE_MAX_AGE = 15 * 60 * 1000; // 15 min
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
// Access cookie: short-lived, sent on all API paths
const setAccessCookie = (res, accessToken) => {
    res.cookie('token', accessToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure: isProd,
        maxAge: ACCESS_COOKIE_MAX_AGE,
        path: '/',
    });
};
// Refresh cookie: long-lived, scoped to auth routes only, stricter SameSite
const setRefreshCookie = (res, refreshToken) => {
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure: isProd,
        maxAge: REFRESH_COOKIE_MAX_AGE,
        path: '/api/v1/auth',
    });
};
const clearAuthCookies = (res) => {
    res.clearCookie('token', { path: '/' });
    res.clearCookie('refreshToken', { path: '/api/v1/auth' });
};
router.post('/login', (0, validate_1.validate)({ body: schemas_1.loginSchema }), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const result = await authService.login(req.body.email, req.body.password);
    setAccessCookie(res, result.accessToken);
    setRefreshCookie(res, result.refreshToken);
    return (0, response_1.ok)(req, res, { user: result.user });
}));
router.post('/refresh', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const raw = req.cookies?.refreshToken;
    if (!raw) {
        clearAuthCookies(res);
        return res.status(401).json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Missing refresh token', requestId: req.requestId },
        });
    }
    try {
        const result = await authService.refresh(raw);
        setAccessCookie(res, result.accessToken);
        setRefreshCookie(res, result.refreshToken);
        return (0, response_1.ok)(req, res, { user: result.user });
    }
    catch (err) {
        clearAuthCookies(res);
        throw err; // re-thrown to errorHandler → 401 envelope
    }
}));
router.post('/logout', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const raw = req.cookies?.refreshToken;
    if (raw) {
        await authService.logout(raw); // revoke the refresh token
    }
    clearAuthCookies(res);
    return (0, response_1.ok)(req, res, { loggedOut: true });
}));
router.get('/me', auth_1.authenticate, (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = await authService.getMe(req.user.id);
    return (0, response_1.ok)(req, res, user);
}));
router.post('/register', auth_1.authenticate, (0, auth_1.authorize)(['super_admin', 'centre_manager']), (0, validate_1.validate)({ body: schemas_1.registerSchema }), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const centreId = req.user.role === 'centre_manager' ? req.user.centreId : req.body.centreId;
    const user = await authService.registerUser({
        ...req.body,
        centreId,
        actorId: req.user.id,
        actorRole: req.user.role,
    });
    return (0, response_1.created)(req, res, user);
}));
router.post('/change-password', auth_1.authenticate, (0, validate_1.validate)({ body: schemas_1.changePasswordSchema }), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    await authService.changePassword(req.user.id, req.body.currentPassword, req.body.newPassword);
    return (0, response_1.ok)(req, res, { changed: true });
}));
exports.default = router;
