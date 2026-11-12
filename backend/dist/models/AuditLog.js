"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLog = void 0;
const mongoose_1 = require("mongoose");
const auditLogSchema = new mongoose_1.Schema({
    centreId: { type: mongoose_1.Schema.Types.ObjectId, required: true, ref: 'DaycareCentre', index: true },
    userId: { type: mongoose_1.Schema.Types.ObjectId, required: true, ref: 'User' },
    action: { type: String, required: true }, // e.g., 'CREATE', 'UPDATE', 'DELETE'
    resourceType: { type: String, required: true }, // e.g., 'Child', 'FeeRecord'
    resourceId: { type: mongoose_1.Schema.Types.ObjectId, required: true },
    createdAt: { type: Date, default: Date.now }
});
exports.AuditLog = (0, mongoose_1.model)('AuditLog', auditLogSchema);
