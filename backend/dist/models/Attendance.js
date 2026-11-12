"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startOfUtcDay = exports.Attendance = void 0;
const mongoose_1 = require("mongoose");
const attendanceSchema = new mongoose_1.Schema({
    centreId: { type: mongoose_1.Schema.Types.ObjectId, required: true, ref: 'DaycareCentre', index: true },
    childId: { type: mongoose_1.Schema.Types.ObjectId, required: true, ref: 'Child' },
    date: { type: Date, required: true, index: true },
    status: { type: String, enum: ['present', 'absent', 'late'], required: true },
    recordedBy: { type: mongoose_1.Schema.Types.ObjectId, required: true, ref: 'User' },
}, { timestamps: true });
attendanceSchema.index({ childId: 1, date: 1 }, { unique: true });
exports.Attendance = (0, mongoose_1.model)('Attendance', attendanceSchema);
/** Normalize to UTC midnight for unique-per-day semantics. */
const startOfUtcDay = (d = new Date()) => {
    const x = new Date(d);
    x.setUTCHours(0, 0, 0, 0);
    return x;
};
exports.startOfUtcDay = startOfUtcDay;
