"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DaycareCentre = void 0;
const mongoose_1 = require("mongoose");
const daycareCentreSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
}, { timestamps: true });
exports.DaycareCentre = (0, mongoose_1.model)('DaycareCentre', daycareCentreSchema);
