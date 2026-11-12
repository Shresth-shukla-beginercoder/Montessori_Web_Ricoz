"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.created = exports.ok = void 0;
const ok = (req, res, data, status = 200, meta) => {
    return res.status(status).json({
        success: true,
        data,
        meta: {
            requestId: req.headers['x-request-id'] || 'n/a',
            ...meta,
        },
    });
};
exports.ok = ok;
const created = (req, res, data, meta) => (0, exports.ok)(req, res, data, 201, meta);
exports.created = created;
