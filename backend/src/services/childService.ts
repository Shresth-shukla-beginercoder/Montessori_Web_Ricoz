import { Child } from '../models/Child';
import { User } from '../models/User';
import { notFound, badRequest } from '../utils/errors';
import { writeAudit } from './auditService';
import type { IChild } from '../models/Child';
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

export const createChild = async (
  actor: Actor,
  input: { name: string; dob: string; centreId?: string; parentIds?: string[]; status?: string }
) => {
  const centreId = resolveCentre(actor, input.centreId);

  // Parent links must be users in this centre.
  if (input.parentIds && input.parentIds.length > 0) {
    const parents = await User.find({ _id: { $in: input.parentIds }, centreId, role: 'parent' });
    if (parents.length !== input.parentIds.length) {
      throw badRequest('One or more parentIds are not parent users in this centre');
    }
  }

  const child = await Child.create({
    centreId,
    name: input.name,
    dob: new Date(input.dob),
    parentIds: input.parentIds ?? [],
    status: input.status ?? 'active',
  });

  await writeAudit({
    centreId,
    userId: actor.id,
    action: 'CREATE',
    resourceType: 'Child',
    resourceId: String(child._id),
  });

  return child;
};

export const listChildren = async (
  actor: Actor,
  query: { centreId?: string; status?: string; page?: number; limit?: number },
  parentId?: string
) => {
  const centreId = resolveCentre(actor, query.centreId);
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(100, Math.max(1, query.limit ?? 20));

  const filter: Record<string, unknown> = { centreId };
  if (query.status) filter.status = query.status;
  if (parentId) filter.parentIds = parentId;

  // Teacher-child assignment enforcement
  if (actor.role === 'teacher') {
    const assignedIds = await getAssignedChildIds(actor.id, actor.role, actor.centreId);
    if (assignedIds && assignedIds.length > 0) {
      filter._id = { $in: assignedIds.map((id) => id) };
    } else {
      // Teacher with no assignments: empty list
      return { items: [], total: 0, page, limit };
    }
  }

  const [items, total] = await Promise.all([
    Child.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Child.countDocuments(filter),
  ]);

  return { items, total, page, limit };
};

export const getChild = async (actor: Actor, childId: string, queryCentreId?: string, parentId?: string) => {
  const centreId = resolveCentre(actor, queryCentreId);
  const child = await Child.findOne({ _id: childId, centreId });
  if (!child) throw notFound('Child not found');
  if (parentId && !(child.parentIds || []).map(String).includes(parentId)) {
    throw notFound('Child not found');
  }

  // Teacher-child assignment enforcement
  if (actor.role === 'teacher') {
    const assignedIds = await getAssignedChildIds(actor.id, actor.role, actor.centreId);
    if (!assignedIds || (assignedIds.length > 0 && !assignedIds.includes(String(child._id)))) {
      throw notFound('Child not found');
    }
  }

  return child;
};

export const updateChild = async (
  actor: Actor,
  childId: string,
  input: { name?: string; dob?: string; parentIds?: string[]; status?: string }
) => {
  const child = await getChild(actor, childId);

  if (actor.role === 'parent') {
    throw badRequest('Parents cannot modify child records');
  }

  const update: Record<string, unknown> = {};
  if (input.name !== undefined) update.name = input.name;
  if (input.dob !== undefined) update.dob = new Date(input.dob);
  if (input.status !== undefined) update.status = input.status;

  if (input.parentIds) {
    const parents = await User.find({ _id: { $in: input.parentIds }, centreId: child.centreId, role: 'parent' });
    if (parents.length !== input.parentIds.length) {
      throw badRequest('One or more parentIds are not parent users in this centre');
    }
    update.parentIds = input.parentIds;
  }

  const updated = await Child.findByIdAndUpdate(child._id, update, { new: true, runValidators: true });
  if (!updated) throw notFound('Child not found');

  await writeAudit({
    centreId: String(child.centreId),
    userId: actor.id,
    action: 'UPDATE',
    resourceType: 'Child',
    resourceId: String(updated._id),
  });

  return updated;
};

export const deleteChild = async (actor: Actor, childId: string) => {
  const child = await getChild(actor, childId);
  if (actor.role !== 'centre_manager' && actor.role !== 'super_admin') {
    throw badRequest('Only managers or HQ may remove children');
  }
  await child.deleteOne();
  await writeAudit({
    centreId: String(child.centreId),
    userId: actor.id,
    action: 'DELETE',
    resourceType: 'Child',
    resourceId: String(child._id),
  });
  return { ok: true };
};
