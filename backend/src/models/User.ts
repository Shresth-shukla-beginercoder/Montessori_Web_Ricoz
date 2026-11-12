import { Schema, model, Document } from 'mongoose';
import { UserRole } from '../types/auth';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  centreId?: Schema.Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ['super_admin', 'centre_manager', 'teacher', 'parent'],
      required: true,
    },
    centreId: { type: Schema.Types.ObjectId, ref: 'DaycareCentre', index: true },
  },
  { timestamps: true }
);

export const User = model<IUser>('User', userSchema);
