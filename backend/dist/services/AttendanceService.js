"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAttendance = exports.logAttendance = void 0;
const Attendance_1 = require("../models/Attendance");
const Child_1 = require("../models/Child");
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
const logAttendance = async (actor, input) => {
    const centreId = resolveCentre(actor);
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
    const day = (0, Attendance_1.startOfUtcDay)(input.date ? new Date(input.date) : new Date());
    try {
        const record = await Attendance_1.Attendance.findOneAndUpdate({ childId: child._id, date: day }, {
            $set: {
                status: input.status,
                recordedBy: actor.id,
                centreId,
            },
            $setOnInsert: {
                childId: child._id,
                date: day,
            },
        }, { upsert: true, new: true, runValidators: true });
        await (0, auditService_1.writeAudit)({
            centreId,
            userId: actor.id,
            action: 'UPSERT',
            resourceType: 'Attendance',
            resourceId: String(record._id),
        });
        return record;
    }
    catch (err) {
        if (err.code === 11000) {
            throw (0, errors_1.conflict)('Attendance already logged for this child today');
        }
        throw err;
    }
};
exports.logAttendance = logAttendance;
const listAttendance = async (actor, query) => {
    const centreId = resolveCentre(actor, query.centreId);
    const filter = { centreId };
    if (query.childId)
        filter.childId = query.childId;
    if (query.date) {
        filter.date = (0, Attendance_1.startOfUtcDay)(new Date(query.date));
    }
    else {
        filter.date = (0, Attendance_1.startOfUtcDay)(new Date());
    }
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
    return Attendance_1.Attendance.find(filter).sort({ createdAt: -1 });
};
exports.listAttendance = listAttendance;
