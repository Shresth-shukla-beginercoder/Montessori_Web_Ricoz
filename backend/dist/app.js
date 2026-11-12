"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const pino_http_1 = __importDefault(require("pino-http"));
const mongoose_1 = __importDefault(require("mongoose"));
const logger_1 = __importDefault(require("./utils/logger"));
const v1_1 = __importDefault(require("./routes/v1"));
const errorMiddleware_1 = require("./middleware/errorMiddleware");
const requestId_1 = require("./middleware/requestId");
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
}));
app.use(express_1.default.json({ limit: '1mb' }));
app.use((0, cookie_parser_1.default)());
app.use(requestId_1.requestId);
app.use((0, pino_http_1.default)({ logger: logger_1.default }));
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: { code: 'TOO_MANY_REQUESTS', message: 'Rate limit exceeded' },
    },
});
app.use('/api/v1/auth', authLimiter);
app.get('/health', (_req, res) => {
    res.status(200).json({ success: true, data: { status: 'ok' } });
});
app.get('/ready', (_req, res) => {
    const ready = mongoose_1.default.connection.readyState === 1;
    if (!ready) {
        return res.status(503).json({
            success: false,
            error: { code: 'NOT_READY', message: 'Database not connected' },
        });
    }
    return res.status(200).json({ success: true, data: { status: 'ready' } });
});
app.use('/api/v1', v1_1.default);
// Unknown routes: respond with the standard 404 envelope instead of Express's HTML 404.
app.use((_req, res) => {
    res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Route not found' },
    });
});
app.use(errorMiddleware_1.errorHandler);
exports.default = app;
