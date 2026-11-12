"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markRead = exports.createNotification = exports.listForUser = void 0;
const Notification_1 = require("../models/Notification");
const errors_1 = require("../utils/errors");
const listForUser = async (recipientId, centreId) => {
    const filter = { recipientId };
    if (centreId)
        filter.centreId = centreId;
    return Notification_1.Notification.find(filter).sort({ createdAt: -1 }).limit(100);
};
exports.listForUser = listForUser;
const createNotification = async (input) => {
    return Notification_1.Notification.create(input);
};
exports.createNotification = createNotification;
const markRead = async (id, recipientId) => {
    const note = await Notification_1.Notification.findOneAndUpdate({ _id: id, recipientId }, { read: true }, { new: true });
    if (!note)
        throw (0, errors_1.notFound)('Notification not found');
    return note;
};
exports.markRead = markRead;
