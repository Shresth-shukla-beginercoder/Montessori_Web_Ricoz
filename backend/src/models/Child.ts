import { Schema, model, Document } from 'mongoose';

export interface IChild extends Document {
  centreId: Schema.Types.ObjectId | string;
  name: string;
  dob: Date;
  parentIds: (Schema.Types.ObjectId | string)[];
  status: 'active' | 'inactive' | 'withdrawn';
  createdAt: Date;
  updatedAt: Date;
}

const childSchema = new Schema(
  {
    centreId: { type: Schema.Types.ObjectId, required: true, ref: 'DaycareCentre', index: true },
    name: { type: String, required: true, trim: true },
    dob: { type: Date, required: true },
    parentIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    status: {
      type: String,
      enum: ['active', 'inactive', 'withdrawn'],
      default: 'active',
    },
  },
  { timestamps: true }
);

export const Child = model<IChild>('Child', childSchema);
