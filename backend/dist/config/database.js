"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const logger_1 = __importDefault(require("../utils/logger"));
const connectDB = async (uri) => {
    try {
        await mongoose_1.default.connect(uri);
        logger_1.default.info('Connected to MongoDB successfully');
    }
    catch (error) {
        logger_1.default.error({ err: error }, 'Database connection error');
        process.exit(1);
    }
};
exports.connectDB = connectDB;
