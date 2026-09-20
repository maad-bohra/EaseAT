import * as notificationService from '../services/notification.service.js';
import { asyncHandler } from '../utils/ApiError.js';

export const list = asyncHandler(async (req, res) => {
  const { unreadOnly, limit } = req.validatedQuery || {};
  const [notifications, unread] = await Promise.all([
    notificationService.listNotifications(req.user.id, { unreadOnly, limit }),
    notificationService.countUnread(req.user.id),
  ]);
  res.json({ notifications, unread });
});

export const refresh = asyncHandler(async (req, res) => {
  const created = await notificationService.refreshNotifications(req.user.id);
  res.json({ created: created.length, notifications: created });
});

export const markRead = asyncHandler(async (req, res) => {
  res.json({ notification: await notificationService.markRead(req.user.id, req.params.id) });
});

export const markAllRead = asyncHandler(async (req, res) => {
  const { count } = await notificationService.markAllRead(req.user.id);
  res.json({ message: `${count} marked as read` });
});

export const remove = asyncHandler(async (req, res) => {
  await notificationService.deleteNotification(req.user.id, req.params.id);
  res.json({ message: 'Notification deleted' });
});
