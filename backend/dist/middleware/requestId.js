"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestId = void 0;
const crypto_1 = require("crypto");
const requestId = (req, res, next) => {
    const id = req.headers['x-request-id'] || (0, crypto_1.randomUUID)();
    req.headers['x-request-id'] = id;
    res.setHeader('X-Request-Id', id);
    next();
};
exports.requestId = requestId;
