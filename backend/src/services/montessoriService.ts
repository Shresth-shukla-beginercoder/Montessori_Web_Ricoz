import { MontessoriLog } from '../models/MontessoriLog';
import { Child } from '../models/Child';
import { notFound, badRequest, forbidden } from '../utils/errors';
import { writeAudit } from './auditService';
import { getAssignedChildIds } from './staffService';

const AREAS = ['Practical Life', 'Sensorial', 'Language', 'Mathematics', 'Cultural'] as const;

type Actor = { id: string; role: string; centreId?: string };

const resolveCentre = (actor: Actor, queryCentreId?: string) => {
  if (actor.role === 'super_admin') {
    if (!queryCentreId) throw badRequest('centreId required for super_admin');
    return String(queryCentreId);
  }
  if (!actor.centreId) throw forbidden('No centre assigned');
  return String(actor.centreId);
};

export const createLog = async (
  actor: Actor,
  input: { childId: string; area: string; observation: string; date?: string }
) => {
  if (actor.role !== 'teacher' && actor.role !== 'centre_manager') {
    throw forbidden('Only teachers or managers can create Montessori logs');
  }
  const centreId = resolveCentre(actor);
  if (!AREAS.includes(input.area as (typeof AREAS)[number])) {
    throw badRequest(`area must be one of: ${AREAS.join(', ')}`);
  }

  const child = await Child.findOne({ _id: input.childId, centreId });
  if (!child) throw notFound('Child not found');

  // Teacher-child assignment enforcement
  if (actor.role === 'teacher') {
    const assignedIds = await getAssignedChildIds(actor.id, actor.role, actor.centreId);
    if (!assignedIds || (assignedIds.length > 0 && !assignedIds.includes(String(child._id)))) {
      throw notFound('Child not found');
    }
  }

  const log = await MontessoriLog.create({
    centreId,
    childId: child._id,
    area: input.area,
    observation: input.observation,
    date: input.date ? new Date(input.date) : new Date(),
  });

  await writeAudit({
    centreId,
    userId: actor.id,
    action: 'CREATE',
    resourceType: 'MontessoriLog',
    resourceId: String(log._id),
  });

  return log;
};

export const listLogs = async (
  actor: Actor,
  query: { centreId?: string; childId?: string; area?: string }
) => {
  if (actor.role === 'parent') {
    const children = await Child.find({ parentIds: actor.id }).select('_id');
    const childIds = children.map((c) => c._id);
    const filter: Record<string, unknown> = { childId: { $in: childIds } };
    if (query.childId) {
      if (!childIds.some((id) => String(id) === query.childId)) throw notFound('Logs not found');
      filter.childId = query.childId;
    }
    if (query.area) filter.area = query.area;
    return MontessoriLog.find(filter).sort({ date: -1 }).limit(100);
  }

  const centreId = resolveCentre(actor, query.centreId);
  const filter: Record<string, unknown> = { centreId };
  if (query.childId) filter.childId = query.childId;
  if (query.area) filter.area = query.area;

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

  return MontessoriLog.find(filter).sort({ date: -1 }).limit(100);
};

export const MONTESSORI_AREAS = AREAS;
