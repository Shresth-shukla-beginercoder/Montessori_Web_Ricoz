import { Attendance, startOfUtcDay } from '../models/Attendance';
import { Child } from '../models/Child';
import { notFound, badRequest, conflict } from '../utils/errors';
import { writeAudit } from './auditService';
import { getAssignedChildIds } from './staffService';

type Actor = { id: string; role: string; centreId?: string };

const resolveCentre = (actor: Actor, queryCentreId?: string) => {
  if (actor.role === 'super_admin') {
    if (!queryCentreId) throw badRequest('centreId required for super_admin queries');
    return String(queryCentreId);
  }
  if (!actor.centreId) throw badRequest('Account not assigned to a centre');
  return String(actor.centreId);
};

export const logAttendance = async (
  actor: Actor,
  input: { childId: string; status: 'present' | 'absent' | 'late'; date?: string }
) => {
  const centreId = resolveCentre(actor);

  const child = await Child.findOne({ _id: input.childId, centreId });
  if (!child) throw notFound('Child not found');

  // Teacher-child assignment enforcement
  if (actor.role === 'teacher') {
    const assignedIds = await getAssignedChildIds(actor.id, actor.role, actor.centreId);
    if (!assignedIds || (assignedIds.length > 0 && !assignedIds.includes(String(child._id)))) {
      throw notFound('Child not found');
    }
  }

  const day = startOfUtcDay(input.date ? new Date(input.date) : new Date());

  try {
    const record = await Attendance.findOneAndUpdate(
      { childId: child._id, date: day },
      {
        $set: {
          status: input.status,
          recordedBy: actor.id,
          centreId,
        },
        $setOnInsert: {
          childId: child._id,
          date: day,
        },
      },
      { upsert: true, new: true, runValidators: true }
    );

    await writeAudit({
      centreId,
      userId: actor.id,
      action: 'UPSERT',
      resourceType: 'Attendance',
      resourceId: String(record!._id),
    });

    return record;
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000) {
      throw conflict('Attendance already logged for this child today');
    }
    throw err;
  }
};

export const listAttendance = async (
  actor: Actor,
  query: { centreId?: string; date?: string; childId?: string }
) => {
  const centreId = resolveCentre(actor, query.centreId);
  const filter: Record<string, unknown> = { centreId };

  if (query.childId) filter.childId = query.childId;

  if (query.date) {
    filter.date = startOfUtcDay(new Date(query.date));
  } else {
    filter.date = startOfUtcDay(new Date());
  }

  // Teacher-child assignment enforcement
  if (actor.role === 'teacher') {
    const assignedIds = await getAssignedChildIds(actor.id, actor.role, actor.centreId);
    if (assignedIds && assignedIds.length > 0) {
      filter.childId = { $in: assignedIds.map((id) => id) };
    } else {
      // Teacher with no assignments: empty list
      return [];
    }
  }

  return Attendance.find(filter).sort({ createdAt: -1 });
};
