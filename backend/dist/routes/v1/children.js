"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const childService = __importStar(require("../../services/childService"));
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const zod_1 = require("zod");
const schemas_1 = require("../../validation/schemas");
const asyncHandler_1 = require("../../utils/asyncHandler");
const response_1 = require("../../utils/response");
const router = (0, express_1.Router)();
const bodySchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    dob: zod_1.z.string().or(zod_1.z.coerce.date()),
    parentIds: zod_1.z.array(zod_1.z.string()).optional(),
    centreId: zod_1.z.string().optional(),
    status: zod_1.z.enum(['active', 'inactive', 'withdrawn']).optional(),
});
const patchSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).optional(),
    dob: zod_1.z.string().optional(),
    parentIds: zod_1.z.array(zod_1.z.string()).optional(),
    status: zod_1.z.enum(['active', 'inactive', 'withdrawn']).optional(),
});
router.post('/', auth_1.authenticate, (0, auth_1.authorize)(['centre_manager', 'super_admin']), (0, validate_1.validate)({ body: bodySchema }), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const child = await childService.createChild(req.user, {
        name: req.body.name,
        dob: String(req.body.dob),
        parentIds: req.body.parentIds,
        status: req.body.status,
        centreId: req.body.centreId,
    });
    return (0, response_1.created)(req, res, child);
}));
router.get('/', auth_1.authenticate, (0, auth_1.authorize)(['centre_manager', 'teacher', 'parent', 'super_admin']), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const result = await childService.listChildren(req.user, {
        centreId: typeof req.query.centreId === 'string' ? req.query.centreId : undefined,
        status: req.query.status,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
    }, req.user.role === 'parent' ? req.user.id : undefined);
    return (0, response_1.ok)(req, res, result.items, 200, {
        page: result.page,
        limit: result.limit,
        total: result.total,
    });
}));
router.get('/:id', auth_1.authenticate, (0, auth_1.authorize)(['centre_manager', 'teacher', 'parent', 'super_admin']), (0, validate_1.validate)({ params: schemas_1.idParamSchema }), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const child = await childService.getChild(req.user, String(req.params.id), typeof req.query.centreId === 'string' ? req.query.centreId : undefined, req.user.role === 'parent' ? req.user.id : undefined);
    return (0, response_1.ok)(req, res, child);
}));
router.patch('/:id', auth_1.authenticate, (0, auth_1.authorize)(['centre_manager', 'super_admin']), (0, validate_1.validate)({ params: schemas_1.idParamSchema, body: patchSchema }), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const child = await childService.updateChild(req.user, String(req.params.id), {
        name: req.body.name,
        dob: req.body.dob ? String(req.body.dob) : undefined,
        parentIds: Array.isArray(req.body.parentIds) ? req.body.parentIds : undefined,
        status: req.body.status,
    });
    return (0, response_1.ok)(req, res, child);
}));
router.delete('/:id', auth_1.authenticate, (0, auth_1.authorize)(['centre_manager', 'super_admin']), (0, validate_1.validate)({ params: schemas_1.idParamSchema }), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    await childService.deleteChild(req.user, String(req.params.id));
    return res.status(204).send();
}));
exports.default = router;
