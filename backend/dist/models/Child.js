"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Child = void 0;
const mongoose_1 = require("mongoose");
const childSchema = new mongoose_1.Schema({
    centreId: { type: mongoose_1.Schema.Types.ObjectId, required: true, ref: 'DaycareCentre', index: true },
    name: { type: String, required: true, trim: true },
    dob: { type: Date, required: true },
    parentIds: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }],
    status: {
        type: String,
        enum: ['active', 'inactive', 'withdrawn'],
        default: 'active',
    },
}, { timestamps: true });
exports.Child = (0, mongoose_1.model)('Child', childSchema);
