import { FeeRecord } from '../models/FeeRecord';
import { Child } from '../models/Child';
import { notFound, badRequest, forbidden } from '../utils/errors';
import { writeAudit } from './auditService';

type Actor = { id: string; role: string; centreId?: string };

const resolveCentre = (actor: Actor, queryCentreId?: string) => {
  if (actor.role === 'super_admin') {
    if (!queryCentreId) throw badRequest('centreId required for super_admin');
    return String(queryCentreId);
  }
  if (!actor.centreId) throw forbidden('No centre assigned');
  return String(actor.centreId);
};

export const listFees = async (actor: Actor, query: { centreId?: string; childId?: string }) => {
  if (actor.role === 'parent') {
    const children = await Child.find({ parentIds: actor.id }).select('_id');
    const childIds = children.map((c) => c._id);
    const filter: Record<string, unknown> = { childId: { $in: childIds } };
    if (query.childId) {
      if (!childIds.some((id) => String(id) === query.childId)) throw notFound('Fee records not found');
      filter.childId = query.childId;
    }
    return FeeRecord.find(filter).sort({ dueDate: -1 });
  }

  const centreId = resolveCentre(actor, query.centreId);
  const filter: Record<string, unknown> = { centreId };
  if (query.childId) filter.childId = query.childId;
  return FeeRecord.find(filter).sort({ dueDate: -1 });
};

export const createFee = async (
  actor: Actor,
  input: { childId: string; amount: number; status?: 'paid' | 'pending' | 'overdue'; dueDate: string }
) => {
  if (actor.role !== 'centre_manager' && actor.role !== 'super_admin') {
    throw forbidden('Only managers can create fee records');
  }
  const centreId = resolveCentre(actor);
  const child = await Child.findOne({ _id: input.childId, centreId });
  if (!child) throw notFound('Child not found');

  const record = await FeeRecord.create({
    centreId,
    childId: child._id,
    amount: input.amount,
    status: input.status ?? 'pending',
    dueDate: new Date(input.dueDate),
  });

  await writeAudit({
    centreId,
    userId: actor.id,
    action: 'CREATE',
    resourceType: 'FeeRecord',
    resourceId: String(record._id),
  });

  return record;
};

export const updateFee = async (
  actor: Actor,
  id: string,
  input: { amount?: number; status?: 'paid' | 'pending' | 'overdue'; dueDate?: string }
) => {
  if (actor.role !== 'centre_manager' && actor.role !== 'super_admin') {
    throw forbidden('Only managers can update fee records');
  }
  const centreId = resolveCentre(actor);
  const update: Record<string, unknown> = {};
  if (input.amount !== undefined) update.amount = input.amount;
  if (input.status !== undefined) update.status = input.status;
  if (input.dueDate !== undefined) update.dueDate = new Date(input.dueDate);

  const record = await FeeRecord.findOneAndUpdate({ _id: id, centreId }, update, {
    new: true,
    runValidators: true,
  });
  if (!record) throw notFound('Fee record not found');

  await writeAudit({
    centreId,
    userId: actor.id,
    action: 'UPDATE',
    resourceType: 'FeeRecord',
    resourceId: String(record._id),
  });

  return record;
};
