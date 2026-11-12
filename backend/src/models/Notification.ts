import { Schema, model, Document } from 'mongoose';

export interface INotification extends Document {
  centreId: string;
  recipientId: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

const notificationSchema = new Schema({
  centreId: { type: Schema.Types.ObjectId, required: true, ref: 'DaycareCentre', index: true },
  recipientId: { type: Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

export const Notification = model<INotification>('Notification', notificationSchema);
