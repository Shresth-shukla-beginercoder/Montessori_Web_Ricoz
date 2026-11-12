"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateFee = exports.createFee = exports.listFees = void 0;
const FeeRecord_1 = require("../models/FeeRecord");
const Child_1 = require("../models/Child");
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
const listFees = async (actor, query) => {
    if (actor.role === 'parent') {
        const children = await Child_1.Child.find({ parentIds: actor.id }).select('_id');
        const childIds = children.map((c) => c._id);
        const filter = { childId: { $in: childIds } };
        if (query.childId) {
            if (!childIds.some((id) => String(id) === query.childId))
                throw (0, errors_1.notFound)('Fee records not found');
            filter.childId = query.childId;
        }
        return FeeRecord_1.FeeRecord.find(filter).sort({ dueDate: -1 });
    }
    const centreId = resolveCentre(actor, query.centreId);
    const filter = { centreId };
    if (query.childId)
        filter.childId = query.childId;
    return FeeRecord_1.FeeRecord.find(filter).sort({ dueDate: -1 });
};
exports.listFees = listFees;
const createFee = async (actor, input) => {
    if (actor.role !== 'centre_manager' && actor.role !== 'super_admin') {
        throw (0, errors_1.forbidden)('Only managers can create fee records');
    }
    const centreId = resolveCentre(actor);
    const child = await Child_1.Child.findOne({ _id: input.childId, centreId });
    if (!child)
        throw (0, errors_1.notFound)('Child not found');
    const record = await FeeRecord_1.FeeRecord.create({
        centreId,
        childId: child._id,
        amount: input.amount,
        status: input.status ?? 'pending',
        dueDate: new Date(input.dueDate),
    });
    await (0, auditService_1.writeAudit)({
        centreId,
        userId: actor.id,
        action: 'CREATE',
        resourceType: 'FeeRecord',
        resourceId: String(record._id),
    });
    return record;
};
exports.createFee = createFee;
const updateFee = async (actor, id, input) => {
    if (actor.role !== 'centre_manager' && actor.role !== 'super_admin') {
        throw (0, errors_1.forbidden)('Only managers can update fee records');
    }
    const centreId = resolveCentre(actor);
    const update = {};
    if (input.amount !== undefined)
        update.amount = input.amount;
    if (input.status !== undefined)
        update.status = input.status;
    if (input.dueDate !== undefined)
        update.dueDate = new Date(input.dueDate);
    const record = await FeeRecord_1.FeeRecord.findOneAndUpdate({ _id: id, centreId }, update, {
        new: true,
        runValidators: true,
    });
    if (!record)
        throw (0, errors_1.notFound)('Fee record not found');
    await (0, auditService_1.writeAudit)({
        centreId,
        userId: actor.id,
        action: 'UPDATE',
        resourceType: 'FeeRecord',
        resourceId: String(record._id),
    });
    return record;
};
exports.updateFee = updateFee;
