import { DaycareCentre } from '../models/DaycareCentre';
import { notFound, badRequest, forbidden } from '../utils/errors';
import { writeAudit } from './auditService';

type Actor = { id: string; role: string; centreId?: string };

export const listCentres = async (actor: Actor) => {
  if (actor.role === 'super_admin') {
    return DaycareCentre.find().sort({ name: 1 });
  }
  if (!actor.centreId) throw forbidden('No centre assigned');
  return DaycareCentre.find({ _id: actor.centreId });
};

export const getCentre = async (actor: Actor, id: string) => {
  if (actor.role !== 'super_admin' && String(actor.centreId) !== String(id)) {
    throw notFound('Centre not found');
  }
  const centre = await DaycareCentre.findById(id);
  if (!centre) throw notFound('Centre not found');
  return centre;
};

export const createCentre = async (
  actor: Actor,
  input: { name: string; address: string; status?: 'active' | 'inactive' }
) => {
  if (actor.role !== 'super_admin') throw forbidden('Only HQ can create centres');
  const centre = await DaycareCentre.create({
    name: input.name,
    address: input.address,
    status: input.status ?? 'active',
  });
  await writeAudit({
    centreId: String(centre._id),
    userId: actor.id,
    action: 'CREATE',
    resourceType: 'DaycareCentre',
    resourceId: String(centre._id),
  });
  return centre;
};

export const updateCentre = async (
  actor: Actor,
  id: string,
  input: { name?: string; address?: string; status?: 'active' | 'inactive' }
) => {
  if (actor.role !== 'super_admin' && String(actor.centreId) !== String(id)) {
    throw notFound('Centre not found');
  }
  if (actor.role === 'centre_manager' && input.status !== undefined) {
    throw badRequest('Managers cannot change centre status');
  }
  const centre = await DaycareCentre.findByIdAndUpdate(id, input, { new: true, runValidators: true });
  if (!centre) throw notFound('Centre not found');
  await writeAudit({
    centreId: String(centre._id),
    userId: actor.id,
    action: 'UPDATE',
    resourceType: 'DaycareCentre',
    resourceId: String(centre._id),
  });
  return centre;
};
