"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MONTESSORI_AREAS = exports.listLogs = exports.createLog = void 0;
const MontessoriLog_1 = require("../models/MontessoriLog");
const Child_1 = require("../models/Child");
const errors_1 = require("../utils/errors");
const auditService_1 = require("./auditService");
const staffService_1 = require("./staffService");
const AREAS = ['Practical Life', 'Sensorial', 'Language', 'Mathematics', 'Cultural'];
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
const createLog = async (actor, input) => {
    if (actor.role !== 'teacher' && actor.role !== 'centre_manager') {
        throw (0, errors_1.forbidden)('Only teachers or managers can create Montessori logs');
    }
    const centreId = resolveCentre(actor);
    if (!AREAS.includes(input.area)) {
        throw (0, errors_1.badRequest)(`area must be one of: ${AREAS.join(', ')}`);
    }
    const child = await Child_1.Child.findOne({ _id: input.childId, centreId });
    if (!child)
        throw (0, errors_1.notFound)('Child not found');
    // Teacher-child assignment enforcement
    if (actor.role === 'teacher') {
        const assignedIds = await (0, staffService_1.getAssignedChildIds)(actor.id, actor.role, actor.centreId);
        if (!assignedIds || (assignedIds.length > 0 && !assignedIds.includes(String(child._id)))) {
            throw (0, errors_1.notFound)('Child not found');
        }
    }
    const log = await MontessoriLog_1.MontessoriLog.create({
        centreId,
        childId: child._id,
        area: input.area,
        observation: input.observation,
        date: input.date ? new Date(input.date) : new Date(),
    });
    await (0, auditService_1.writeAudit)({
        centreId,
        userId: actor.id,
        action: 'CREATE',
        resourceType: 'MontessoriLog',
        resourceId: String(log._id),
    });
    return log;
};
exports.createLog = createLog;
const listLogs = async (actor, query) => {
    if (actor.role === 'parent') {
        const children = await Child_1.Child.find({ parentIds: actor.id }).select('_id');
        const childIds = children.map((c) => c._id);
        const filter = { childId: { $in: childIds } };
        if (query.childId) {
            if (!childIds.some((id) => String(id) === query.childId))
                throw (0, errors_1.notFound)('Logs not found');
            filter.childId = query.childId;
        }
        if (query.area)
            filter.area = query.area;
        return MontessoriLog_1.MontessoriLog.find(filter).sort({ date: -1 }).limit(100);
    }
    const centreId = resolveCentre(actor, query.centreId);
    const filter = { centreId };
    if (query.childId)
        filter.childId = query.childId;
    if (query.area)
        filter.area = query.area;
    // Teacher-child assignment enforcement
    if (actor.role === 'teacher') {
        const assignedIds = await (0, staffService_1.getAssignedChildIds)(actor.id, actor.role, actor.centreId);
        if (assignedIds && assignedIds.length > 0) {
            filter.childId = { $in: assignedIds.map((id) => id) };
        }
        else {
            // Teacher with no assignments: empty list
            return [];
        }
    }
    return MontessoriLog_1.MontessoriLog.find(filter).sort({ date: -1 }).limit(100);
};
exports.listLogs = listLogs;
exports.MONTESSORI_AREAS = AREAS;
