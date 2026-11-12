import { Notification } from '../models/Notification';
import { notFound } from '../utils/errors';

export const listForUser = async (recipientId: string, centreId?: string) => {
  const filter: Record<string, unknown> = { recipientId };
  if (centreId) filter.centreId = centreId;
  return Notification.find(filter).sort({ createdAt: -1 }).limit(100);
};

export const createNotification = async (input: {
  centreId: string;
  recipientId: string;
  message: string;
}) => {
  return Notification.create(input);
};

export const markRead = async (id: string, recipientId: string) => {
  const note = await Notification.findOneAndUpdate(
    { _id: id, recipientId },
    { read: true },
    { new: true }
  );
  if (!note) throw notFound('Notification not found');
  return note;
};
