"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefreshToken = void 0;
const mongoose_1 = require("mongoose");
const refreshTokenSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, required: true, ref: 'User', index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true, index: true },
    revoked: { type: Boolean, default: false, index: true },
}, { timestamps: { createdAt: true, updatedAt: false } });
// Compound index for efficient lookups
refreshTokenSchema.index({ userId: 1, revoked: 1, expiresAt: 1 });
exports.RefreshToken = (0, mongoose_1.model)('RefreshToken', refreshTokenSchema);
