import { Schema, model, Document } from 'mongoose';

export interface IAuditLog extends Document {
  centreId: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  createdAt: Date;
}

const auditLogSchema = new Schema({
  centreId: { type: Schema.Types.ObjectId, required: true, ref: 'DaycareCentre', index: true },
  userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  action: { type: String, required: true }, // e.g., 'CREATE', 'UPDATE', 'DELETE'
  resourceType: { type: String, required: true }, // e.g., 'Child', 'FeeRecord'
  resourceId: { type: Schema.Types.ObjectId, required: true },
  createdAt: { type: Date, default: Date.now }
});

export const AuditLog = model<IAuditLog>('AuditLog', auditLogSchema);
