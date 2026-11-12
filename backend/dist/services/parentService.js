"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getParent = exports.getMyChildren = exports.createParent = exports.listParents = void 0;
const Parent_1 = require("../models/Parent");
const User_1 = require("../models/User");
const Child_1 = require("../models/Child");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const errors_1 = require("../utils/errors");
const auditService_1 = require("./auditService");
const resolveCentre = (actor, queryCentreId) => {
    if (actor.role === 'super_admin') {
        if (!queryCentreId)
            throw (0, errors_1.badRequest)('centreId required for super_admin');
        return String(queryCentreId);
    }
    if (!actor.centreId)
        throw (0, errors_1.forbidden)('No centre assigned');
    return String(actor.centreId);
};
const listParents = async (actor, queryCentreId) => {
    const centreId = resolveCentre(actor, queryCentreId);
    return Parent_1.Parent.find({ centreId }).sort({ name: 1 });
};
exports.listParents = listParents;
const createParent = async (actor, input) => {
    if (actor.role !== 'centre_manager' && actor.role !== 'super_admin') {
        throw (0, errors_1.forbidden)('Only managers can create parents');
    }
    const centreId = resolveCentre(actor, input.centreId);
    const existing = await User_1.User.findOne({ email: input.email.toLowerCase().trim() });
    if (existing)
        throw (0, errors_1.badRequest)('Email already registered');
    const passwordHash = await bcryptjs_1.default.hash(input.password, 10);
    const user = await User_1.User.create({
        email: input.email.toLowerCase().trim(),
        passwordHash,
        name: input.name,
        role: 'parent',
        centreId,
    });
    const parent = await Parent_1.Parent.create({
        centreId,
        userId: user._id,
        name: input.name,
        phone: input.phone,
    });
    await (0, auditService_1.writeAudit)({
        centreId,
        userId: actor.id,
        action: 'CREATE',
        resourceType: 'Parent',
        resourceId: String(parent._id),
    });
    return parent;
};
exports.createParent = createParent;
const getMyChildren = async (actor) => {
    if (actor.role !== 'parent')
        throw (0, errors_1.forbidden)('Parents only');
    return Child_1.Child.find({ parentIds: actor.id, status: 'active' });
};
exports.getMyChildren = getMyChildren;
const getParent = async (actor, id, queryCentreId) => {
    const centreId = resolveCentre(actor, queryCentreId);
    const parent = await Parent_1.Parent.findOne({ _id: id, centreId });
    if (!parent)
        throw (0, errors_1.notFound)('Parent not found');
    return parent;
};
exports.getParent = getParent;
