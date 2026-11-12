"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHqDashboard = exports.getCentreDashboard = void 0;
const Child_1 = require("../models/Child");
const Attendance_1 = require("../models/Attendance");
const FeeRecord_1 = require("../models/FeeRecord");
const Staff_1 = require("../models/Staff");
const DaycareCentre_1 = require("../models/DaycareCentre");
const errors_1 = require("../utils/errors");
const getCentreDashboard = async (actor, queryCentreId) => {
    let centreId;
    if (actor.role === 'super_admin') {
        if (!queryCentreId)
            throw (0, errors_1.badRequest)('centreId required');
        centreId = queryCentreId;
    }
    else if (actor.role === 'centre_manager' || actor.role === 'teacher') {
        if (!actor.centreId)
            throw (0, errors_1.forbidden)('No centre assigned');
        centreId = String(actor.centreId);
    }
    else {
        throw (0, errors_1.forbidden)('Dashboard not available for this role');
    }
    const today = (0, Attendance_1.startOfUtcDay)(new Date());
    const [activeChildren, staffCount, todayAttendance, pendingFees, overdueFees] = await Promise.all([
        Child_1.Child.countDocuments({ centreId, status: 'active' }),
        Staff_1.Staff.countDocuments({ centreId }),
        Attendance_1.Attendance.find({ centreId, date: today }),
        FeeRecord_1.FeeRecord.countDocuments({ centreId, status: 'pending' }),
        FeeRecord_1.FeeRecord.countDocuments({ centreId, status: 'overdue' }),
    ]);
    const present = todayAttendance.filter((a) => a.status === 'present' || a.status === 'late').length;
    const absent = todayAttendance.filter((a) => a.status === 'absent').length;
    return {
        centreId,
        activeChildren,
        staffCount,
        attendanceToday: {
            logged: todayAttendance.length,
            present,
            absent,
            late: todayAttendance.filter((a) => a.status === 'late').length,
        },
        fees: { pending: pendingFees, overdue: overdueFees },
    };
};
exports.getCentreDashboard = getCentreDashboard;
const getHqDashboard = async (actor) => {
    if (actor.role !== 'super_admin')
        throw (0, errors_1.forbidden)('HQ only');
    const centres = await DaycareCentre_1.DaycareCentre.find({ status: 'active' });
    const summaries = await Promise.all(centres.map(async (c) => {
        const centreId = String(c._id);
        const [children, staff] = await Promise.all([
            Child_1.Child.countDocuments({ centreId, status: 'active' }),
            Staff_1.Staff.countDocuments({ centreId }),
        ]);
        return { id: centreId, name: c.name, activeChildren: children, staffCount: staff };
    }));
    return {
        totalCentres: centres.length,
        totalActiveChildren: summaries.reduce((s, x) => s + x.activeChildren, 0),
        centres: summaries,
    };
};
exports.getHqDashboard = getHqDashboard;
