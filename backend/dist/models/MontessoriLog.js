"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MontessoriLog = void 0;
const mongoose_1 = require("mongoose");
const montessoriLogSchema = new mongoose_1.Schema({
    centreId: { type: mongoose_1.Schema.Types.ObjectId, required: true, ref: 'DaycareCentre', index: true },
    childId: { type: mongoose_1.Schema.Types.ObjectId, required: true, ref: 'Child', index: true },
    area: { type: String, required: true },
    observation: { type: String, required: true },
    date: { type: Date, default: Date.now, index: true },
}, { timestamps: true });
exports.MontessoriLog = (0, mongoose_1.model)('MontessoriLog', montessoriLogSchema);
