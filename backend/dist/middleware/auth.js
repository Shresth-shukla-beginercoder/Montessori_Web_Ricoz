"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireCentre = exports.authorize = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const authenticate = (req, res, next) => {
    const token = req.cookies?.token;
    if (!token) {
        return res.status(401).json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'No token provided' },
        });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET);
        req.user = {
            id: decoded.id,
            role: decoded.role,
            centreId: decoded.centreId,
            email: decoded.email,
        };
        next();
    }
    catch {
        return res.status(401).json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Invalid token' },
        });
    }
};
exports.authenticate = authenticate;
const authorize = (roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Access denied' },
            });
        }
        next();
    };
};
exports.authorize = authorize;
const requireCentre = (req, res, next) => {
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
exports.requireCentre = requireCentre;
