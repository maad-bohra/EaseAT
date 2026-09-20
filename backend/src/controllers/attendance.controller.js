import * as sessionService from '../services/session.service.js';
import * as attendanceService from '../services/attendance.service.js';
import * as notificationService from '../services/notification.service.js';
import { asyncHandler } from '../utils/ApiError.js';
import { prisma } from '../lib/prisma.js';

export const list = asyncHandler(async (req, res) => {
  const sessions = await sessionService.listSessions(req.user.id, req.validatedQuery || {});
  res.json({ sessions });
});

export const create = asyncHandler(async (req, res) => {
  res.status(201).json({ session: await sessionService.createSession(req.user.id, req.body) });
});

export const update = asyncHandler(async (req, res) => {
  const session = await sessionService.updateSessionStatus(req.user.id, req.params.id, req.body);
  res.json({ session });
});

export const bulkMark = asyncHandler(async (req, res) => {
  const { sessionIds, status } = req.body;
  const { count } = await prisma.attendanceSession.updateMany({
    where: { id: { in: sessionIds }, userId: req.user.id },
    data: { status, markedAt: new Date() },
  });
  res.json({ message: `${count} classes updated`, updated: count });
});

export const remove = asyncHandler(async (req, res) => {
  await sessionService.deleteSession(req.user.id, req.params.id);
  res.json({ message: 'Class removed' });
});

export const reschedule = asyncHandler(async (req, res) => {
  const result = await sessionService.rescheduleSession(req.user.id, req.params.id, req.body);
  await notificationService.notifyReschedule(req.user.id, {
    subjectName: result.replacement.subject.name,
    from: `${result.original.date} ${result.original.startTime}`,
    to: `${result.replacement.date} ${result.replacement.startTime}`,
  });
  res.json(result);
});

export const generate = asyncHandler(async (req, res) => {
  const result = await sessionService.generateSessions(req.user.id, req.body.from, req.body.to);
  res.json({ message: `${result.created} class sessions created`, ...result });
});

export const summary = asyncHandler(async (req, res) => {
  res.json(await attendanceService.getSummary(req.user.id, req.validatedQuery || {}));
});

export const prediction = asyncHandler(async (req, res) => {
  const target = req.validatedQuery?.target;
  res.json(await attendanceService.getSubjectPrediction(req.user.id, req.params.subjectId, { target }));
});

export const predictions = asyncHandler(async (req, res) => {
  res.json({ predictions: await attendanceService.getAllPredictions(req.user.id) });
});

export const today = asyncHandler(async (req, res) => {
  res.json(await attendanceService.getTodayAndUpcoming(req.user.id));
});
