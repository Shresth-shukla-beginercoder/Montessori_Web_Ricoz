"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const mongoose_1 = require("mongoose");
const userSchema = new mongoose_1.Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    role: {
        type: String,
        enum: ['super_admin', 'centre_manager', 'teacher', 'parent'],
        required: true,
    },
    centreId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'DaycareCentre', index: true },
}, { timestamps: true });
exports.User = (0, mongoose_1.model)('User', userSchema);
