"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAssignedChildIds = exports.assignChildren = exports.getStaff = exports.createStaff = exports.listStaff = void 0;
const Staff_1 = require("../models/Staff");
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
const listStaff = async (actor, queryCentreId) => {
    const centreId = resolveCentre(actor, queryCentreId);
    return Staff_1.Staff.find({ centreId }).sort({ name: 1 });
};
exports.listStaff = listStaff;
const createStaff = async (actor, input) => {
    const centreId = resolveCentre(actor, input.centreId);
    if (actor.role === 'centre_manager' && input.role === 'centre_manager') {
        throw (0, errors_1.badRequest)('Managers cannot create other managers');
    }
    const existing = await User_1.User.findOne({ email: input.email.toLowerCase().trim() });
    if (existing)
        throw (0, errors_1.badRequest)('Email already registered');
    const passwordHash = await bcryptjs_1.default.hash(input.password, 10);
    const user = await User_1.User.create({
        email: input.email.toLowerCase().trim(),
        passwordHash,
        name: input.name,
        role: input.role,
        centreId,
    });
    const staff = await Staff_1.Staff.create({
        centreId,
        userId: user._id,
        name: input.name,
        role: input.role,
    });
    await (0, auditService_1.writeAudit)({
        centreId,
        userId: actor.id,
        action: 'CREATE',
        resourceType: 'Staff',
        resourceId: String(staff._id),
    });
    return staff;
};
exports.createStaff = createStaff;
const getStaff = async (actor, id, queryCentreId) => {
    const centreId = resolveCentre(actor, queryCentreId);
    const staff = await Staff_1.Staff.findOne({ _id: id, centreId });
    if (!staff)
        throw (0, errors_1.notFound)('Staff not found');
    return staff;
};
exports.getStaff = getStaff;
/**
 * Replace the explicit child assignments for a teacher (full replacement).
 * centre_manager (within their centre) or super_admin (with centreId).
 * All childIds must belong to the same centre.
 */
const assignChildren = async (actor, staffId, childIds, queryCentreId) => {
    const centreId = resolveCentre(actor, queryCentreId);
    const staff = await Staff_1.Staff.findOne({ _id: staffId, centreId });
    if (!staff)
        throw (0, errors_1.notFound)('Staff not found');
    if (staff.role !== 'teacher') {
        throw (0, errors_1.badRequest)('Only teachers have child assignments');
    }
    const normalized = childIds.map((c) => String(c));
    if (normalized.length > 0) {
        const found = await Child_1.Child.find({ _id: { $in: normalized }, centreId });
        const foundIds = new Set(found.map((c) => String(c._id)));
        const invalid = normalized.filter((c) => !foundIds.has(c));
        if (invalid.length > 0) {
            throw (0, errors_1.badRequest)('One or more childIds do not belong to this centre');
        }
    }
    staff.assignedChildren = normalized.map((c) => c);
    await staff.save();
    await (0, auditService_1.writeAudit)({
        centreId,
        userId: actor.id,
        action: 'UPDATE',
        resourceType: 'Staff',
        resourceId: String(staff._id),
    });
    return staff;
};
exports.assignChildren = assignChildren;
/**
 * Resolve the explicit child IDs a teacher is assigned to, for a given user.
 * - teacher with assignments → only those children
 * - teacher with no assignments → empty (no child access)
 * - managers / super_admin / parents → undefined (no teacher filtering)
 */
const getAssignedChildIds = async (userId, role, centreId) => {
    if (role !== 'teacher')
        return undefined;
    if (!centreId)
        return [];
    const staff = await Staff_1.Staff.findOne({ userId, centreId });
    return staff?.assignedChildren?.map((c) => String(c)) ?? [];
};
exports.getAssignedChildIds = getAssignedChildIds;
