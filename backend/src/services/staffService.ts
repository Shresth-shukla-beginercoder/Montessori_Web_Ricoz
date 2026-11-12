import { Staff } from '../models/Staff';
import { User } from '../models/User';
import { Child } from '../models/Child';
import bcrypt from 'bcryptjs';
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

export const listStaff = async (actor: Actor, queryCentreId?: string) => {
  const centreId = resolveCentre(actor, queryCentreId);
  return Staff.find({ centreId }).sort({ name: 1 });
};

export const createStaff = async (
  actor: Actor,
  input: {
    name: string;
    email: string;
    password: string;
    role: 'teacher' | 'centre_manager';
    centreId?: string;
  }
) => {
  const centreId = resolveCentre(actor, input.centreId);

  if (actor.role === 'centre_manager' && input.role === 'centre_manager') {
    throw badRequest('Managers cannot create other managers');
  }

  const existing = await User.findOne({ email: input.email.toLowerCase().trim() });
  if (existing) throw badRequest('Email already registered');

  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await User.create({
    email: input.email.toLowerCase().trim(),
    passwordHash,
    name: input.name,
    role: input.role,
    centreId,
  });

  const staff = await Staff.create({
    centreId,
    userId: user._id,
    name: input.name,
    role: input.role,
  });

  await writeAudit({
    centreId,
    userId: actor.id,
    action: 'CREATE',
    resourceType: 'Staff',
    resourceId: String(staff._id),
  });

  return staff;
};

export const getStaff = async (actor: Actor, id: string, queryCentreId?: string) => {
  const centreId = resolveCentre(actor, queryCentreId);
  const staff = await Staff.findOne({ _id: id, centreId });
  if (!staff) throw notFound('Staff not found');
  return staff;
};

/**
 * Replace the explicit child assignments for a teacher (full replacement).
 * centre_manager (within their centre) or super_admin (with centreId).
 * All childIds must belong to the same centre.
 */
export const assignChildren = async (actor: Actor, staffId: string, childIds: string[], queryCentreId?: string) => {
  const centreId = resolveCentre(actor, queryCentreId);

  const staff = await Staff.findOne({ _id: staffId, centreId });
  if (!staff) throw notFound('Staff not found');
  if (staff.role !== 'teacher') {
    throw badRequest('Only teachers have child assignments');
  }

  const normalized = childIds.map((c) => String(c));
  if (normalized.length > 0) {
    const found = await Child.find({ _id: { $in: normalized }, centreId });
    const foundIds = new Set(found.map((c) => String(c._id)));
    const invalid = normalized.filter((c) => !foundIds.has(c));
    if (invalid.length > 0) {
      throw badRequest('One or more childIds do not belong to this centre');
    }
  }

  staff.assignedChildren = normalized.map((c) => c);
  await staff.save();

  await writeAudit({
    centreId,
    userId: actor.id,
    action: 'UPDATE',
    resourceType: 'Staff',
    resourceId: String(staff._id),
  });

  return staff;
};

/**
 * Resolve the explicit child IDs a teacher is assigned to, for a given user.
 * - teacher with assignments → only those children
 * - teacher with no assignments → empty (no child access)
 * - managers / super_admin / parents → undefined (no teacher filtering)
 */
export const getAssignedChildIds = async (userId: string, role: string, centreId?: string): Promise<string[] | undefined> => {
  if (role !== 'teacher') return undefined;
  if (!centreId) return [];
  const staff = await Staff.findOne({ userId, centreId });
  return staff?.assignedChildren?.map((c) => String(c)) ?? [];
};
