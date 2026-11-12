"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignChildrenSchema = exports.paginationQuery = exports.idParamSchema = exports.createMontessoriSchema = exports.updateFeeSchema = exports.createFeeSchema = exports.createParentSchema = exports.createStaffSchema = exports.updateCentreSchema = exports.createCentreSchema = exports.createAttendanceSchema = exports.updateChildSchema = exports.createChildSchema = exports.changePasswordSchema = exports.registerSchema = exports.loginSchema = exports.objectId = void 0;
const zod_1 = require("zod");
exports.objectId = zod_1.z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid ObjectId');
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
});
exports.registerSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8),
    name: zod_1.z.string().min(1),
    role: zod_1.z.enum(['super_admin', 'centre_manager', 'teacher', 'parent']),
    centreId: exports.objectId.optional(),
});
exports.changePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(1),
    newPassword: zod_1.z.string().min(8),
});
exports.createChildSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    dob: zod_1.z.union([zod_1.z.string().min(1), zod_1.z.coerce.date()]),
    parentIds: zod_1.z.array(exports.objectId).optional(),
    status: zod_1.z.enum(['active', 'inactive', 'withdrawn']).optional(),
    centreId: exports.objectId.optional(),
});
exports.updateChildSchema = exports.createChildSchema.partial();
exports.createAttendanceSchema = zod_1.z.object({
    childId: exports.objectId,
    status: zod_1.z.enum(['present', 'absent', 'late']),
    date: zod_1.z.string().optional(),
});
exports.createCentreSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    address: zod_1.z.string().min(1),
    status: zod_1.z.enum(['active', 'inactive']).optional(),
});
exports.updateCentreSchema = exports.createCentreSchema.partial();
exports.createStaffSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8),
    role: zod_1.z.enum(['teacher', 'centre_manager']),
    centreId: exports.objectId.optional(),
});
exports.createParentSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8),
    phone: zod_1.z.string().min(7),
    centreId: exports.objectId.optional(),
});
exports.createFeeSchema = zod_1.z.object({
    childId: exports.objectId,
    amount: zod_1.z.number().positive(),
    status: zod_1.z.enum(['paid', 'pending', 'overdue']).optional(),
    dueDate: zod_1.z.string(),
});
exports.updateFeeSchema = zod_1.z.object({
    amount: zod_1.z.number().positive().optional(),
    status: zod_1.z.enum(['paid', 'pending', 'overdue']).optional(),
    dueDate: zod_1.z.string().optional(),
});
exports.createMontessoriSchema = zod_1.z.object({
    childId: exports.objectId,
    area: zod_1.z.string().min(1),
    observation: zod_1.z.string().min(1),
    date: zod_1.z.string().optional(),
});
exports.idParamSchema = zod_1.z.object({
    id: exports.objectId,
});
exports.paginationQuery = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().optional(),
    limit: zod_1.z.coerce.number().int().positive().max(100).optional(),
    centreId: exports.objectId.optional(),
    status: zod_1.z.string().optional(),
    childId: exports.objectId.optional(),
    date: zod_1.z.string().optional(),
    area: zod_1.z.string().optional(),
});
exports.assignChildrenSchema = zod_1.z.object({
    childIds: zod_1.z.array(exports.objectId),
});
