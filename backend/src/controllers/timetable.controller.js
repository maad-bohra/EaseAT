import * as timetableService from '../services/timetable.service.js';
import { asyncHandler } from '../utils/ApiError.js';

export const list = asyncHandler(async (req, res) => {
  const [entries, week] = await Promise.all([
    timetableService.listTimetable(req.user.id),
    timetableService.getWeeklyTimetable(req.user.id),
  ]);
  res.json({ entries, week });
});

export const create = asyncHandler(async (req, res) => {
  res.status(201).json({ entry: await timetableService.createEntry(req.user.id, req.body) });
});

export const createMany = asyncHandler(async (req, res) => {
  const entries = await timetableService.createEntries(req.user.id, req.body.entries);
  res.status(201).json({ entries, created: entries.length });
});

export const update = asyncHandler(async (req, res) => {
  res.json({ entry: await timetableService.updateEntry(req.user.id, req.params.id, req.body) });
});

export const remove = asyncHandler(async (req, res) => {
  const result = await timetableService.deleteEntry(req.user.id, req.params.id);
  res.json({ message: 'Class slot removed', ...result });
});
