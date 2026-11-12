"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteChild = exports.updateChild = exports.getChild = exports.listChildren = exports.createChild = void 0;
const Child_1 = require("../models/Child");
const User_1 = require("../models/User");
const errors_1 = require("../utils/errors");
const auditService_1 = require("./auditService");
const staffService_1 = require("./staffService");
const resolveCentre = (actor, queryCentreId) => {
    if (actor.role === 'super_admin') {
        if (!queryCentreId)
            throw (0, errors_1.badRequest)('centreId required for super_admin queries');
        return String(queryCentreId);
    }
    if (!actor.centreId)
        throw (0, errors_1.badRequest)('Account not assigned to a centre');
    return String(actor.centreId);
};
const createChild = async (actor, input) => {
    const centreId = resolveCentre(actor, input.centreId);
    // Parent links must be users in this centre.
    if (input.parentIds && input.parentIds.length > 0) {
        const parents = await User_1.User.find({ _id: { $in: input.parentIds }, centreId, role: 'parent' });
        if (parents.length !== input.parentIds.length) {
            throw (0, errors_1.badRequest)('One or more parentIds are not parent users in this centre');
        }
    }
    const child = await Child_1.Child.create({
        centreId,
        name: input.name,
        dob: new Date(input.dob),
        parentIds: input.parentIds ?? [],
        status: input.status ?? 'active',
    });
    await (0, auditService_1.writeAudit)({
        centreId,
        userId: actor.id,
        action: 'CREATE',
        resourceType: 'Child',
        resourceId: String(child._id),
    });
    return child;
};
exports.createChild = createChild;
const listChildren = async (actor, query, parentId) => {
    const centreId = resolveCentre(actor, query.centreId);
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const filter = { centreId };
    if (query.status)
        filter.status = query.status;
    if (parentId)
        filter.parentIds = parentId;
    // Teacher-child assignment enforcement
    if (actor.role === 'teacher') {
        const assignedIds = await (0, staffService_1.getAssignedChildIds)(actor.id, actor.role, actor.centreId);
        if (assignedIds && assignedIds.length > 0) {
            filter._id = { $in: assignedIds.map((id) => id) };
        }
        else {
            // Teacher with no assignments: empty list
            return { items: [], total: 0, page, limit };
        }
    }
    const [items, total] = await Promise.all([
        Child_1.Child.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
        Child_1.Child.countDocuments(filter),
    ]);
    return { items, total, page, limit };
};
exports.listChildren = listChildren;
const getChild = async (actor, childId, queryCentreId, parentId) => {
    const centreId = resolveCentre(actor, queryCentreId);
    const child = await Child_1.Child.findOne({ _id: childId, centreId });
    if (!child)
        throw (0, errors_1.notFound)('Child not found');
    if (parentId && !(child.parentIds || []).map(String).includes(parentId)) {
        throw (0, errors_1.notFound)('Child not found');
    }
    // Teacher-child assignment enforcement
    if (actor.role === 'teacher') {
        const assignedIds = await (0, staffService_1.getAssignedChildIds)(actor.id, actor.role, actor.centreId);
        if (!assignedIds || (assignedIds.length > 0 && !assignedIds.includes(String(child._id)))) {
            throw (0, errors_1.notFound)('Child not found');
        }
    }
    return child;
};
exports.getChild = getChild;
const updateChild = async (actor, childId, input) => {
    const child = await (0, exports.getChild)(actor, childId);
    if (actor.role === 'parent') {
        throw (0, errors_1.badRequest)('Parents cannot modify child records');
    }
    const update = {};
    if (input.name !== undefined)
        update.name = input.name;
    if (input.dob !== undefined)
        update.dob = new Date(input.dob);
    if (input.status !== undefined)
        update.status = input.status;
    if (input.parentIds) {
        const parents = await User_1.User.find({ _id: { $in: input.parentIds }, centreId: child.centreId, role: 'parent' });
        if (parents.length !== input.parentIds.length) {
            throw (0, errors_1.badRequest)('One or more parentIds are not parent users in this centre');
        }
        update.parentIds = input.parentIds;
    }
    const updated = await Child_1.Child.findByIdAndUpdate(child._id, update, { new: true, runValidators: true });
    if (!updated)
        throw (0, errors_1.notFound)('Child not found');
    await (0, auditService_1.writeAudit)({
        centreId: String(child.centreId),
        userId: actor.id,
        action: 'UPDATE',
        resourceType: 'Child',
        resourceId: String(updated._id),
    });
    return updated;
};
exports.updateChild = updateChild;
const deleteChild = async (actor, childId) => {
    const child = await (0, exports.getChild)(actor, childId);
    if (actor.role !== 'centre_manager' && actor.role !== 'super_admin') {
        throw (0, errors_1.badRequest)('Only managers or HQ may remove children');
    }
    await child.deleteOne();
    await (0, auditService_1.writeAudit)({
        centreId: String(child.centreId),
        userId: actor.id,
        action: 'DELETE',
        resourceType: 'Child',
        resourceId: String(child._id),
    });
    return { ok: true };
};
exports.deleteChild = deleteChild;
