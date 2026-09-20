import { prisma } from '../lib/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { timeToMinutes, DAY_NAMES } from '../utils/dates.js';
import { regenerateHorizon } from './session.service.js';

function assertTimeOrder(startTime, endTime) {
  if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
    throw ApiError.badRequest('The class must end after it starts');
  }
}

/** Rejects overlapping slots on the same weekday, ignoring `ignoreId` on edits. */
async function assertNoOverlap(userId, { dayOfWeek, startTime, endTime }, ignoreId = null) {
  const sameDay = await prisma.timetableEntry.findMany({
    where: { userId, dayOfWeek, active: true, ...(ignoreId ? { NOT: { id: ignoreId } } : {}) },
  });
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);

  const clash = sameDay.find(
    (e) => start < timeToMinutes(e.endTime) && end > timeToMinutes(e.startTime),
  );
  if (clash) {
    throw ApiError.conflict(
      `That overlaps an existing class on ${DAY_NAMES[dayOfWeek]} at ${clash.startTime}`,
    );
  }
}

export function listTimetable(userId) {
  return prisma.timetableEntry.findMany({
    where: { userId },
    include: { subject: { select: { id: true, name: true, code: true, color: true } } },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  });
}

/** Same list, grouped by weekday - the shape the timetable grid wants. */
export async function getWeeklyTimetable(userId) {
  const entries = await listTimetable(userId);
  return DAY_NAMES.map((day, index) => ({
    dayOfWeek: index,
    day,
    entries: entries.filter((e) => e.dayOfWeek === index),
  }));
}

export async function createEntry(userId, data) {
  assertTimeOrder(data.startTime, data.endTime);
  const subject = await prisma.subject.findFirst({ where: { id: data.subjectId, userId } });
  if (!subject) throw ApiError.notFound('That subject was not found');
  await assertNoOverlap(userId, data);

  const entry = await prisma.timetableEntry.create({
    data: { ...data, userId },
    include: { subject: { select: { id: true, name: true, code: true, color: true } } },
  });
  await regenerateHorizon(userId);
  return entry;
}

/** Inserts several slots at once (used by natural-language import). */
export async function createEntries(userId, entries) {
  const created = [];
  for (const entry of entries) {
    created.push(await createEntry(userId, entry));
  }
  return created;
}

export async function updateEntry(userId, id, data) {
  const existing = await prisma.timetableEntry.findFirst({ where: { id, userId } });
  if (!existing) throw ApiError.notFound('That class slot was not found');

  const merged = { ...existing, ...data };
  assertTimeOrder(merged.startTime, merged.endTime);
  await assertNoOverlap(userId, merged, id);

  const entry = await prisma.timetableEntry.update({
    where: { id },
    data,
    include: { subject: { select: { id: true, name: true, code: true, color: true } } },
  });
  await regenerateHorizon(userId);
  return entry;
}

/**
 * Removes the slot and any future sessions the student has not marked yet.
 * Past and already-marked sessions stay, so history is never rewritten.
 */
export async function deleteEntry(userId, id) {
  const existing = await prisma.timetableEntry.findFirst({ where: { id, userId } });
  if (!existing) throw ApiError.notFound('That class slot was not found');

  const today = new Date();
  const { count } = await prisma.attendanceSession.deleteMany({
    where: { userId, timetableEntryId: id, status: 'PENDING', date: { gte: today } },
  });
  await prisma.timetableEntry.delete({ where: { id } });
  return { removedFutureSessions: count };
}
