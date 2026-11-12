"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Parent = void 0;
const mongoose_1 = require("mongoose");
const parentSchema = new mongoose_1.Schema({
    centreId: { type: mongoose_1.Schema.Types.ObjectId, required: true, ref: 'DaycareCentre', index: true },
    userId: { type: mongoose_1.Schema.Types.ObjectId, required: true, ref: 'User', unique: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
}, { timestamps: true });
exports.Parent = (0, mongoose_1.model)('Parent', parentSchema);
