"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const logger_1 = __importDefault(require("../utils/logger"));
const errors_1 = require("../utils/errors");
const errorHandler = (err, req, res, _next) => {
    const requestId = req.headers['x-request-id'] || 'n/a';
    // Malformed JSON body (body-parser raises a SyntaxError) → 400, per API convention.
    if (err instanceof SyntaxError && 'body' in err) {
        return res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Malformed JSON body', requestId },
        });
    }
    if (err instanceof errors_1.AppError) {
        return res.status(err.status).json({
            success: false,
            error: {
                code: err.code,
                message: err.message,
                details: err.details,
                requestId,
            },
        });
    }
    // Mongoose duplicate key
    if (typeof err === 'object' && err && err.code === 11000) {
        return res.status(409).json({
            success: false,
            error: {
                code: 'CONFLICT',
                message: 'Duplicate resource',
                requestId,
            },
        });
    }
    logger_1.default.error({ err, requestId }, 'Unhandled error');
    return res.status(500).json({
        success: false,
        error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An unexpected error occurred.',
            requestId,
        },
    });
};
exports.errorHandler = errorHandler;
