import { Schema, model, Document } from 'mongoose';

export interface IFeeRecord extends Document {
  centreId: Schema.Types.ObjectId | string;
  childId: Schema.Types.ObjectId | string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  dueDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const feeRecordSchema = new Schema(
  {
    centreId: { type: Schema.Types.ObjectId, required: true, ref: 'DaycareCentre', index: true },
    childId: { type: Schema.Types.ObjectId, required: true, ref: 'Child', index: true },
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['paid', 'pending', 'overdue'], required: true, default: 'pending' },
    dueDate: { type: Date, required: true },
  },
  { timestamps: true }
);

export const FeeRecord = model<IFeeRecord>('FeeRecord', feeRecordSchema);
