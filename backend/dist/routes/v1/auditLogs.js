"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AuditLog_1 = require("../../models/AuditLog");
const auth_1 = require("../../middleware/auth");
const asyncHandler_1 = require("../../utils/asyncHandler");
const response_1 = require("../../utils/response");
const errors_1 = require("../../utils/errors");
const router = (0, express_1.Router)();
router.get('/', auth_1.authenticate, (0, auth_1.authorize)(['super_admin', 'centre_manager']), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    let centreId;
    if (req.user.role === 'super_admin') {
        centreId = req.query.centreId;
        if (!centreId)
            throw (0, errors_1.badRequest)('centreId required');
    }
    else {
        if (!req.user.centreId)
            throw (0, errors_1.forbidden)('No centre assigned');
        centreId = String(req.user.centreId);
    }
    const logs = await AuditLog_1.AuditLog.find({ centreId }).sort({ createdAt: -1 }).limit(100);
    return (0, response_1.ok)(req, res, logs);
}));
exports.default = router;
