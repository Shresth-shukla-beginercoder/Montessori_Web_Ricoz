"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Staff = void 0;
const mongoose_1 = require("mongoose");
const staffSchema = new mongoose_1.Schema({
    centreId: { type: mongoose_1.Schema.Types.ObjectId, required: true, ref: 'DaycareCentre', index: true },
    userId: { type: mongoose_1.Schema.Types.ObjectId, required: true, ref: 'User', unique: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ['teacher', 'centre_manager'], required: true },
    assignedChildren: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Child' }], // Teachers only
}, { timestamps: true });
exports.Staff = (0, mongoose_1.model)('Staff', staffSchema);
