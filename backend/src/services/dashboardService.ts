import { Child } from '../models/Child';
import { Attendance, startOfUtcDay } from '../models/Attendance';
import { FeeRecord } from '../models/FeeRecord';
import { Staff } from '../models/Staff';
import { DaycareCentre } from '../models/DaycareCentre';
import { badRequest, forbidden } from '../utils/errors';

type Actor = { id: string; role: string; centreId?: string };

export const getCentreDashboard = async (actor: Actor, queryCentreId?: string) => {
  let centreId: string;
  if (actor.role === 'super_admin') {
    if (!queryCentreId) throw badRequest('centreId required');
    centreId = queryCentreId;
  } else if (actor.role === 'centre_manager' || actor.role === 'teacher') {
    if (!actor.centreId) throw forbidden('No centre assigned');
    centreId = String(actor.centreId);
  } else {
    throw forbidden('Dashboard not available for this role');
  }

  const today = startOfUtcDay(new Date());

  const [activeChildren, staffCount, todayAttendance, pendingFees, overdueFees] = await Promise.all([
    Child.countDocuments({ centreId, status: 'active' }),
    Staff.countDocuments({ centreId }),
    Attendance.find({ centreId, date: today }),
    FeeRecord.countDocuments({ centreId, status: 'pending' }),
    FeeRecord.countDocuments({ centreId, status: 'overdue' }),
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

export const getHqDashboard = async (actor: Actor) => {
  if (actor.role !== 'super_admin') throw forbidden('HQ only');

  const centres = await DaycareCentre.find({ status: 'active' });
  const summaries = await Promise.all(
    centres.map(async (c) => {
      const centreId = String(c._id);
      const [children, staff] = await Promise.all([
        Child.countDocuments({ centreId, status: 'active' }),
        Staff.countDocuments({ centreId }),
      ]);
      return { id: centreId, name: c.name, activeChildren: children, staffCount: staff };
    })
  );

  return {
    totalCentres: centres.length,
    totalActiveChildren: summaries.reduce((s, x) => s + x.activeChildren, 0),
    centres: summaries,
  };
};
