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
const centreService = __importStar(require("../../services/CentreService"));
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const schemas_1 = require("../../validation/schemas");
const asyncHandler_1 = require("../../utils/asyncHandler");
const response_1 = require("../../utils/response");
const router = (0, express_1.Router)();
router.get('/', auth_1.authenticate, (0, auth_1.authorize)(['super_admin', 'centre_manager']), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const centres = await centreService.listCentres(req.user);
    return (0, response_1.ok)(req, res, centres);
}));
router.post('/', auth_1.authenticate, (0, auth_1.authorize)(['super_admin']), (0, validate_1.validate)({ body: schemas_1.createCentreSchema }), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const centre = await centreService.createCentre(req.user, req.body);
    return (0, response_1.created)(req, res, centre);
}));
router.get('/:id', auth_1.authenticate, (0, auth_1.authorize)(['super_admin', 'centre_manager']), (0, validate_1.validate)({ params: schemas_1.idParamSchema }), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const centre = await centreService.getCentre(req.user, String(req.params.id));
    return (0, response_1.ok)(req, res, centre);
}));
router.patch('/:id', auth_1.authenticate, (0, auth_1.authorize)(['super_admin', 'centre_manager']), (0, validate_1.validate)({ params: schemas_1.idParamSchema, body: schemas_1.updateCentreSchema }), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const centre = await centreService.updateCentre(req.user, String(req.params.id), req.body);
    return (0, response_1.ok)(req, res, centre);
}));
exports.default = router;
