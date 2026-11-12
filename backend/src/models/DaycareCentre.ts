import { Schema, model, Document } from 'mongoose';

export interface IDaycareCentre extends Document {
  name: string;
  address: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const daycareCentreSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

export const DaycareCentre = model<IDaycareCentre>('DaycareCentre', daycareCentreSchema);
