import * as calendarService from '../services/calendar.service.js';
import * as uploadService from '../services/upload.service.js';
import { asyncHandler } from '../utils/ApiError.js';
import { ApiError } from '../utils/ApiError.js';
import { startOfMonth, endOfMonth } from '../utils/dates.js';

export const list = asyncHandler(async (req, res) => {
  res.json({ events: await calendarService.listEvents(req.user.id, req.validatedQuery || {}) });
});

export const month = asyncHandler(async (req, res) => {
  const { year, month: m } = req.validatedQuery;
  const [events, holidays] = await Promise.all([
    calendarService.listEvents(req.user.id, {
      from: startOfMonth(year, m),
      to: endOfMonth(year, m),
    }),
    calendarService.getUpcomingHolidays(req.user.id),
  ]);
  res.json({ events, upcomingHolidays: holidays });
});

export const day = asyncHandler(async (req, res) => {
  res.json(await calendarService.getDayDetail(req.user.id, req.validatedQuery.date));
});

export const create = asyncHandler(async (req, res) => {
  res.status(201).json({ event: await calendarService.createEvent(req.user.id, req.body) });
});

export const update = asyncHandler(async (req, res) => {
  res.json({ event: await calendarService.updateEvent(req.user.id, req.params.id, req.body) });
});

export const verify = asyncHandler(async (req, res) => {
  const result = await calendarService.verifyEvents(req.user.id, req.body.ids);
  res.json({ message: `${result.verified} dates confirmed`, ...result });
});

export const remove = asyncHandler(async (req, res) => {
  await calendarService.deleteEvent(req.user.id, req.params.id);
  res.json({ message: 'Calendar entry deleted' });
});

export const upload = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Choose a PDF to upload');
  res.status(201).json(await uploadService.uploadAcademicCalendar(req.user.id, req.file));
});

export const listUploads = asyncHandler(async (req, res) => {
  res.json({ files: await uploadService.listUploads(req.user.id) });
});

export const removeUpload = asyncHandler(async (req, res) => {
  await uploadService.deleteUpload(req.user.id, req.params.id);
  res.json({ message: 'File deleted' });
});
