import { AuditLog } from '../models/AuditLog';

type AuditInput = {
  centreId?: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
};

export const writeAudit = async (input: AuditInput) => {
  if (!input.centreId) return null;
  return AuditLog.create({
    centreId: input.centreId,
    userId: input.userId,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
  });
};
