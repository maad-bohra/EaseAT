import { prisma } from '../lib/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { toDateOnly, formatDateOnly, addDays, todayDateOnly } from '../utils/dates.js';
import { regenerateHorizon } from './session.service.js';

function serialize(event) {
  return { ...event, date: formatDateOnly(event.date) };
}

export async function listEvents(userId, { from, to, verified } = {}) {
  const where = { userId };
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = toDateOnly(from);
    if (to) where.date.lte = toDateOnly(to);
  }
  if (verified !== undefined) where.verified = verified;

  const events = await prisma.academicCalendarEvent.findMany({ where, orderBy: { date: 'asc' } });
  return events.map(serialize);
}

export async function createEvent(userId, data, { source = 'MANUAL', fileId = null } = {}) {
  const event = await prisma.academicCalendarEvent.create({
    data: {
      userId,
      date: toDateOnly(data.date),
      type: data.type,
      title: data.title ?? null,
      description: data.description ?? null,
      verified: data.verified ?? source === 'MANUAL',
      source,
      fileId,
    },
  });
  if (event.verified) await regenerateHorizon(userId);
  return serialize(event);
}

/**
 * Bulk insert of AI-extracted rows. They land unverified, so the session
 * generator ignores them until the student confirms them.
 */
export async function createExtractedEvents(userId, events, fileId) {
  const rows = events.map((e) => ({
    userId,
    date: toDateOnly(e.date),
    type: e.type,
    title: e.title ?? null,
    description: e.description ?? null,
    verified: false,
    source: 'AI_EXTRACTION',
    fileId,
  }));
  await prisma.academicCalendarEvent.createMany({ data: rows, skipDuplicates: true });
  return listEvents(userId, { verified: false });
}

export async function updateEvent(userId, id, data) {
  const existing = await prisma.academicCalendarEvent.findFirst({ where: { id, userId } });
  if (!existing) throw ApiError.notFound('That calendar entry was not found');

  const event = await prisma.academicCalendarEvent.update({
    where: { id },
    data: { ...data, ...(data.date ? { date: toDateOnly(data.date) } : {}) },
  });
  await regenerateHorizon(userId);
  return serialize(event);
}

/** Confirms a batch of extracted dates, then rebuilds the upcoming sessions. */
export async function verifyEvents(userId, ids) {
  const { count } = await prisma.academicCalendarEvent.updateMany({
    where: { id: { in: ids }, userId },
    data: { verified: true },
  });
  const regeneration = await regenerateHorizon(userId);
  return { verified: count, regeneration };
}

export async function deleteEvent(userId, id) {
  const existing = await prisma.academicCalendarEvent.findFirst({ where: { id, userId } });
  if (!existing) throw ApiError.notFound('That calendar entry was not found');
  await prisma.academicCalendarEvent.delete({ where: { id } });
  await regenerateHorizon(userId);
}

export async function getUpcomingHolidays(userId, days = 30) {
  const today = todayDateOnly();
  const events = await prisma.academicCalendarEvent.findMany({
    where: {
      userId,
      verified: true,
      type: { in: ['HOLIDAY', 'VACATION', 'EXAM'] },
      date: { gte: today, lte: addDays(today, days) },
    },
    orderBy: { date: 'asc' },
    take: 10,
  });
  return events.map(serialize);
}

/** Day detail for the monthly calendar view. */
export async function getDayDetail(userId, date) {
  const day = toDateOnly(date);
  const [sessions, events] = await Promise.all([
    prisma.attendanceSession.findMany({
      where: { userId, date: day },
      include: { subject: { select: { id: true, name: true, code: true, color: true } } },
      orderBy: { startTime: 'asc' },
    }),
    prisma.academicCalendarEvent.findMany({ where: { userId, date: day }, orderBy: { type: 'asc' } }),
  ]);

  return {
    date: formatDateOnly(day),
    events: events.map(serialize),
    sessions: sessions.map((s) => ({
      id: s.id,
      subject: s.subject,
      startTime: s.startTime,
      endTime: s.endTime,
      status: s.status,
      notes: s.notes,
      isRescheduled: s.isRescheduled,
      date: formatDateOnly(s.date),
    })),
  };
}
