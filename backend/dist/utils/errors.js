"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.conflict = exports.badRequest = exports.unauthorized = exports.forbidden = exports.notFound = exports.AppError = void 0;
class AppError extends Error {
    status;
    code;
    details;
    constructor(status, code, message, details) {
        super(message);
        this.status = status;
        this.code = code;
        this.details = details;
    }
}
exports.AppError = AppError;
const notFound = (message = 'Resource not found') => new AppError(404, 'NOT_FOUND', message);
exports.notFound = notFound;
const forbidden = (message = 'Access denied') => new AppError(403, 'FORBIDDEN', message);
exports.forbidden = forbidden;
const unauthorized = (message = 'Unauthorized') => new AppError(401, 'UNAUTHORIZED', message);
exports.unauthorized = unauthorized;
const badRequest = (message, details) => new AppError(400, 'BAD_REQUEST', message, details);
exports.badRequest = badRequest;
const conflict = (message) => new AppError(409, 'CONFLICT', message);
exports.conflict = conflict;
