import { Schema, model, Document } from 'mongoose';

export interface IParent extends Document {
  centreId: Schema.Types.ObjectId | string;
  userId: Schema.Types.ObjectId | string;
  name: string;
  phone: string;
  createdAt: Date;
  updatedAt: Date;
}

const parentSchema = new Schema(
  {
    centreId: { type: Schema.Types.ObjectId, required: true, ref: 'DaycareCentre', index: true },
    userId: { type: Schema.Types.ObjectId, required: true, ref: 'User', unique: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

export const Parent = model<IParent>('Parent', parentSchema);
