"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeeRecord = void 0;
const mongoose_1 = require("mongoose");
const feeRecordSchema = new mongoose_1.Schema({
    centreId: { type: mongoose_1.Schema.Types.ObjectId, required: true, ref: 'DaycareCentre', index: true },
    childId: { type: mongoose_1.Schema.Types.ObjectId, required: true, ref: 'Child', index: true },
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['paid', 'pending', 'overdue'], required: true, default: 'pending' },
    dueDate: { type: Date, required: true },
}, { timestamps: true });
exports.FeeRecord = (0, mongoose_1.model)('FeeRecord', feeRecordSchema);
