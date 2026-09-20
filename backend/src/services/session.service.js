import { prisma } from '../lib/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import {
  toDateOnly,
  formatDateOnly,
  eachDateInRange,
  dayOfWeek,
  addDays,
  todayDateOnly,
  compareSessions,
} from '../utils/dates.js';

const BLOCKING_EVENT_TYPES = new Set(['HOLIDAY', 'VACATION', 'SEMESTER_END']);

/**
 * Builds a map of "YYYY-MM-DD" -> { blocked, events } from verified calendar
 * rows. A verified WORKING_DAY always wins over a holiday on the same date,
 * which is how colleges announce compensatory working Saturdays.
 * Unverified (AI-extracted, not yet confirmed) rows are ignored on purpose.
 */
export async function buildCalendarIndex(userId, from, to) {
  const events = await prisma.academicCalendarEvent.findMany({
    where: { userId, verified: true, date: { gte: toDateOnly(from), lte: toDateOnly(to) } },
    orderBy: { date: 'asc' },
  });

  const index = new Map();
  for (const event of events) {
    const key = formatDateOnly(event.date);
    const entry = index.get(key) || { blocked: false, workingDay: false, events: [] };
    entry.events.push(event);
    if (BLOCKING_EVENT_TYPES.has(event.type)) entry.blocked = true;
    if (event.type === 'WORKING_DAY') entry.workingDay = true;
    index.set(key, entry);
  }

  for (const entry of index.values()) {
    if (entry.workingDay) entry.blocked = false;
  }
  return index;
}

export async function isHoliday(userId, date) {
  const index = await buildCalendarIndex(userId, date, date);
  const entry = index.get(formatDateOnly(date));
  return Boolean(entry?.blocked);
}

/**
 * Creates the attendance sessions implied by the weekly timetable for every
 * date in [from, to] that is not blocked by the academic calendar.
 *
 * Idempotent: an existing session for (user, subject, date, startTime) is never
 * duplicated and never overwritten, so a regeneration cannot erase marks the
 * student already made.
 */
export async function generateSessions(userId, from, to) {
  const start = toDateOnly(from);
  const end = toDateOnly(to);
  if (end < start) throw ApiError.badRequest('The end date must be on or after the start date');

  const entries = await prisma.timetableEntry.findMany({
    where: { userId, active: true },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  });
  if (entries.length === 0) {
    return { created: 0, skippedHolidays: 0, existing: 0, removedOnHolidays: 0 };
  }

  const calendar = await buildCalendarIndex(userId, start, end);

  const existing = await prisma.attendanceSession.findMany({
    where: { userId, date: { gte: start, lte: end } },
    select: { id: true, subjectId: true, date: true, startTime: true, status: true },
  });
  const existingKeys = new Set(
    existing.map((s) => `${s.subjectId}|${formatDateOnly(s.date)}|${s.startTime}`),
  );

  const toCreate = [];
  let skippedHolidays = 0;

  for (const date of eachDateInRange(start, end)) {
    const key = formatDateOnly(date);
    if (calendar.get(key)?.blocked) {
      skippedHolidays += 1;
      continue;
    }
    const weekday = dayOfWeek(date);
    for (const entry of entries) {
      if (entry.dayOfWeek !== weekday) continue;
      if (entry.effectiveFrom && date < toDateOnly(entry.effectiveFrom)) continue;
      if (entry.effectiveTo && date > toDateOnly(entry.effectiveTo)) continue;

      const sessionKey = `${entry.subjectId}|${key}|${entry.startTime}`;
      if (existingKeys.has(sessionKey)) continue;
      existingKeys.add(sessionKey);

      toCreate.push({
        userId,
        subjectId: entry.subjectId,
        timetableEntryId: entry.id,
        date,
        startTime: entry.startTime,
        endTime: entry.endTime,
        status: 'PENDING',
      });
    }
  }

  const result = await prisma.attendanceSession.createMany({
    data: toCreate,
    skipDuplicates: true,
  });

  const removedOnHolidays = await removeUnmarkedSessionsOnBlockedDates(userId, calendar);

  return {
    created: result.count,
    existing: existing.length,
    skippedHolidays,
    removedOnHolidays,
  };
}

/**
 * When a holiday is confirmed after sessions were generated, the untouched
 * (PENDING) sessions on that date are removed. Sessions the student already
 * marked are left alone - their history stays truthful.
 */
async function removeUnmarkedSessionsOnBlockedDates(userId, calendar) {
  const blockedDates = [...calendar.entries()]
    .filter(([, value]) => value.blocked)
    .map(([key]) => toDateOnly(key));
  if (blockedDates.length === 0) return 0;

  const { count } = await prisma.attendanceSession.deleteMany({
    where: { userId, status: 'PENDING', isRescheduled: false, date: { in: blockedDates } },
  });
  return count;
}

/** Convenience used after timetable or calendar edits: rebuild the near future. */
export function regenerateHorizon(userId, days = 60) {
  const today = todayDateOnly();
  return generateSessions(userId, today, addDays(today, days));
}

export async function listSessions(userId, { from, to, subjectId, status }) {
  const where = { userId };
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = toDateOnly(from);
    if (to) where.date.lte = toDateOnly(to);
  }
  if (subjectId) where.subjectId = subjectId;
  if (status) where.status = status;

  const sessions = await prisma.attendanceSession.findMany({
    where,
    include: {
      subject: { select: { id: true, name: true, code: true, color: true } },
      timetableEntry: { select: { classroom: true, faculty: true } },
    },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  });
  return sessions.map(serializeSession);
}

export async function getSessionOwned(userId, sessionId) {
  const session = await prisma.attendanceSession.findUnique({
    where: { id: sessionId },
    include: { subject: { select: { id: true, name: true, code: true, color: true } } },
  });
  if (!session) throw ApiError.notFound('That class was not found');
  if (session.userId !== userId) throw ApiError.forbidden();
  return session;
}

export async function updateSessionStatus(userId, sessionId, { status, notes }) {
  await getSessionOwned(userId, sessionId);
  const updated = await prisma.attendanceSession.update({
    where: { id: sessionId },
    data: {
      ...(status ? { status, markedAt: new Date() } : {}),
      ...(notes !== undefined ? { notes } : {}),
    },
    include: { subject: { select: { id: true, name: true, code: true, color: true } } },
  });
  return serializeSession(updated);
}

/** Manually add a one-off class that is not on the weekly timetable. */
export async function createSession(userId, data) {
  const subject = await prisma.subject.findFirst({ where: { id: data.subjectId, userId } });
  if (!subject) throw ApiError.notFound('That subject was not found');

  const date = toDateOnly(data.date);
  const clash = await prisma.attendanceSession.findFirst({
    where: { userId, date, startTime: data.startTime },
  });
  if (clash) throw ApiError.conflict('There is already a class at that time on that day');

  const created = await prisma.attendanceSession.create({
    data: {
      userId,
      subjectId: data.subjectId,
      date,
      startTime: data.startTime,
      endTime: data.endTime,
      status: data.status || 'PENDING',
      notes: data.notes,
    },
    include: { subject: { select: { id: true, name: true, code: true, color: true } } },
  });
  return serializeSession(created);
}

export async function deleteSession(userId, sessionId) {
  await getSessionOwned(userId, sessionId);
  await prisma.attendanceSession.delete({ where: { id: sessionId } });
}

/**
 * Cancels the original class and creates the replacement as a fresh, countable
 * session. Both rows remain, linked through rescheduled_classes.
 */
export async function rescheduleSession(userId, sessionId, { date, startTime, endTime, reason }) {
  const original = await getSessionOwned(userId, sessionId);
  const newDate = toDateOnly(date);

  const clash = await prisma.attendanceSession.findFirst({
    where: { userId, date: newDate, startTime },
  });
  if (clash) throw ApiError.conflict('There is already a class at that time on that day');

  return prisma.$transaction(async (tx) => {
    await tx.attendanceSession.update({
      where: { id: original.id },
      data: {
        status: 'CANCELLED',
        notes: reason ? `Rescheduled: ${reason}` : 'Rescheduled',
        markedAt: new Date(),
      },
    });

    const replacement = await tx.attendanceSession.create({
      data: {
        userId,
        subjectId: original.subjectId,
        timetableEntryId: original.timetableEntryId,
        date: newDate,
        startTime,
        endTime,
        status: 'PENDING',
        isRescheduled: true,
        notes: `Moved from ${formatDateOnly(original.date)} ${original.startTime}`,
      },
      include: { subject: { select: { id: true, name: true, code: true, color: true } } },
    });

    await tx.rescheduledClass.create({
      data: {
        userId,
        originalSessionId: original.id,
        newSessionId: replacement.id,
        reason,
      },
    });

    return {
      original: serializeSession({ ...original, status: 'CANCELLED' }),
      replacement: serializeSession(replacement),
    };
  });
}

export function serializeSession(session) {
  return {
    id: session.id,
    subjectId: session.subjectId,
    subject: session.subject
      ? {
          id: session.subject.id,
          name: session.subject.name,
          code: session.subject.code,
          color: session.subject.color,
        }
      : undefined,
    date: formatDateOnly(session.date),
    startTime: session.startTime,
    endTime: session.endTime,
    status: session.status,
    notes: session.notes ?? null,
    isRescheduled: session.isRescheduled ?? false,
    classroom: session.timetableEntry?.classroom ?? null,
    faculty: session.timetableEntry?.faculty ?? null,
  };
}

export { compareSessions };
