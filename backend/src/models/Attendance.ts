import { Schema, model, Document } from 'mongoose';

export interface IAttendance extends Document {
  centreId: Schema.Types.ObjectId | string;
  childId: Schema.Types.ObjectId | string;
  date: Date;
  status: 'present' | 'absent' | 'late';
  recordedBy: Schema.Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

const attendanceSchema = new Schema(
  {
    centreId: { type: Schema.Types.ObjectId, required: true, ref: 'DaycareCentre', index: true },
    childId: { type: Schema.Types.ObjectId, required: true, ref: 'Child' },
    date: { type: Date, required: true, index: true },
    status: { type: String, enum: ['present', 'absent', 'late'], required: true },
    recordedBy: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  },
  { timestamps: true }
);

attendanceSchema.index({ childId: 1, date: 1 }, { unique: true });

export const Attendance = model<IAttendance>('Attendance', attendanceSchema);

/** Normalize to UTC midnight for unique-per-day semantics. */
export const startOfUtcDay = (d: Date = new Date()) => {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
};
