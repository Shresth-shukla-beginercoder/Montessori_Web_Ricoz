import { z } from 'zod';

export const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid ObjectId');

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: z.enum(['super_admin', 'centre_manager', 'teacher', 'parent']),
  centreId: objectId.optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export const createChildSchema = z.object({
  name: z.string().min(1),
  dob: z.union([z.string().min(1), z.coerce.date()]),
  parentIds: z.array(objectId).optional(),
  status: z.enum(['active', 'inactive', 'withdrawn']).optional(),
  centreId: objectId.optional(),
});

export const updateChildSchema = createChildSchema.partial();

export const createAttendanceSchema = z.object({
  childId: objectId,
  status: z.enum(['present', 'absent', 'late']),
  date: z.string().optional(),
});

export const createCentreSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  status: z.enum(['active', 'inactive']).optional(),
});

export const updateCentreSchema = createCentreSchema.partial();

export const createStaffSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['teacher', 'centre_manager']),
  centreId: objectId.optional(),
});

export const createParentSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().min(7),
  centreId: objectId.optional(),
});

export const createFeeSchema = z.object({
  childId: objectId,
  amount: z.number().positive(),
  status: z.enum(['paid', 'pending', 'overdue']).optional(),
  dueDate: z.string(),
});

export const updateFeeSchema = z.object({
  amount: z.number().positive().optional(),
  status: z.enum(['paid', 'pending', 'overdue']).optional(),
  dueDate: z.string().optional(),
});

export const createMontessoriSchema = z.object({
  childId: objectId,
  area: z.string().min(1),
  observation: z.string().min(1),
  date: z.string().optional(),
});

export const idParamSchema = z.object({
  id: objectId,
});

export const paginationQuery = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  centreId: objectId.optional(),
  status: z.string().optional(),
  childId: objectId.optional(),
  date: z.string().optional(),
  area: z.string().optional(),
});

export const assignChildrenSchema = z.object({
  childIds: z.array(objectId),
});
