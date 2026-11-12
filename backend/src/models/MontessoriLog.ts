import { Schema, model, Document } from 'mongoose';

export interface IMontessoriLog extends Document {
  centreId: Schema.Types.ObjectId | string;
  childId: Schema.Types.ObjectId | string;
  area: string;
  observation: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const montessoriLogSchema = new Schema(
  {
    centreId: { type: Schema.Types.ObjectId, required: true, ref: 'DaycareCentre', index: true },
    childId: { type: Schema.Types.ObjectId, required: true, ref: 'Child', index: true },
    area: { type: String, required: true },
    observation: { type: String, required: true },
    date: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

export const MontessoriLog = model<IMontessoriLog>('MontessoriLog', montessoriLogSchema);
