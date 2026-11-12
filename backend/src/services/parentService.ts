import { Parent } from '../models/Parent';
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

export const listParents = async (actor: Actor, queryCentreId?: string) => {
  const centreId = resolveCentre(actor, queryCentreId);
  return Parent.find({ centreId }).sort({ name: 1 });
};

export const createParent = async (
  actor: Actor,
  input: { name: string; email: string; password: string; phone: string; centreId?: string }
) => {
  if (actor.role !== 'centre_manager' && actor.role !== 'super_admin') {
    throw forbidden('Only managers can create parents');
  }
  const centreId = resolveCentre(actor, input.centreId);

  const existing = await User.findOne({ email: input.email.toLowerCase().trim() });
  if (existing) throw badRequest('Email already registered');

  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await User.create({
    email: input.email.toLowerCase().trim(),
    passwordHash,
    name: input.name,
    role: 'parent',
    centreId,
  });

  const parent = await Parent.create({
    centreId,
    userId: user._id,
    name: input.name,
    phone: input.phone,
  });

  await writeAudit({
    centreId,
    userId: actor.id,
    action: 'CREATE',
    resourceType: 'Parent',
    resourceId: String(parent._id),
  });

  return parent;
};

export const getMyChildren = async (actor: Actor) => {
  if (actor.role !== 'parent') throw forbidden('Parents only');
  return Child.find({ parentIds: actor.id, status: 'active' });
};

export const getParent = async (actor: Actor, id: string, queryCentreId?: string) => {
  const centreId = resolveCentre(actor, queryCentreId);
  const parent = await Parent.findOne({ _id: id, centreId });
  if (!parent) throw notFound('Parent not found');
  return parent;
};
