import { Schema, model, Document } from 'mongoose';

export interface IStaff extends Document {
  centreId: Schema.Types.ObjectId | string;
  userId: Schema.Types.ObjectId | string;
  name: string;
  role: 'teacher' | 'centre_manager';
  assignedChildren?: (Schema.Types.ObjectId | string)[]; // Teacher role only: explicit child assignments
  createdAt: Date;
  updatedAt: Date;
}

const staffSchema = new Schema(
  {
    centreId: { type: Schema.Types.ObjectId, required: true, ref: 'DaycareCentre', index: true },
    userId: { type: Schema.Types.ObjectId, required: true, ref: 'User', unique: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ['teacher', 'centre_manager'], required: true },
    assignedChildren: [{ type: Schema.Types.ObjectId, ref: 'Child' }], // Teachers only
  },
  { timestamps: true }
);

export const Staff = model<IStaff>('Staff', staffSchema);
