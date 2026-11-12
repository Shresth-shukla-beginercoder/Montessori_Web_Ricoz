"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeAudit = void 0;
const AuditLog_1 = require("../models/AuditLog");
const writeAudit = async (input) => {
    if (!input.centreId)
        return null;
    return AuditLog_1.AuditLog.create({
        centreId: input.centreId,
        userId: input.userId,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
    });
};
exports.writeAudit = writeAudit;
