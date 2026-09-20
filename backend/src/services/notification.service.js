import { prisma } from '../lib/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { formatDateOnly, todayDateOnly, addDays, DAY_NAMES } from '../utils/dates.js';
import { getSummary, getNextSession } from './attendance.service.js';

/**
 * In-app notifications only for now. `deliver` is the single seam an email or
 * push adapter plugs into later - nothing else in the app writes notifications.
 */
async function deliver(userId, { type, title, message, meta, dedupeKey }) {
  try {
    return await prisma.notification.create({
      data: { userId, type, title, message, meta, dedupeKey },
    });
  } catch (err) {
    if (err.code === 'P2002') return null; // already sent
    throw err;
  }
}

export function listNotifications(userId, { unreadOnly = false, limit = 50 } = {}) {
  return prisma.notification.findMany({
    where: { userId, ...(unreadOnly ? { read: false } : {}) },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export function countUnread(userId) {
  return prisma.notification.count({ where: { userId, read: false } });
}

export async function markRead(userId, id) {
  const existing = await prisma.notification.findFirst({ where: { id, userId } });
  if (!existing) throw ApiError.notFound('That notification was not found');
  return prisma.notification.update({ where: { id }, data: { read: true } });
}

export function markAllRead(userId) {
  return prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
}

export async function deleteNotification(userId, id) {
  const existing = await prisma.notification.findFirst({ where: { id, userId } });
  if (!existing) throw ApiError.notFound('That notification was not found');
  await prisma.notification.delete({ where: { id } });
}

/**
 * Recomputes the notifications a student should see right now. Safe to call on
 * every dashboard load and from a scheduler - dedupeKey keeps it idempotent.
 */
export async function refreshNotifications(userId) {
  const today = formatDateOnly(todayDateOnly());
  const tomorrow = addDays(todayDateOnly(), 1);
  const created = [];

  const summary = await getSummary(userId);
  for (const subject of summary.subjects) {
    if (subject.status === 'BELOW') {
      created.push(
        await deliver(userId, {
          type: 'BELOW_REQUIRED',
          title: `${subject.name} is below ${subject.required}%`,
          message: `${subject.name} is at ${subject.percentage}%. Attend the next classes to recover.`,
          meta: { subjectId: subject.subjectId, percentage: subject.percentage },
          dedupeKey: `below:${subject.subjectId}:${today}`,
        }),
      );
    } else if (subject.status === 'AT_RISK') {
      created.push(
        await deliver(userId, {
          type: 'LOW_ATTENDANCE',
          title: `${subject.name} is close to the limit`,
          message: `${subject.name} is at ${subject.percentage}%, just above the ${subject.required}% requirement.`,
          meta: { subjectId: subject.subjectId, percentage: subject.percentage },
          dedupeKey: `risk:${subject.subjectId}:${today}`,
        }),
      );
    }
  }

  const holidayTomorrow = await prisma.academicCalendarEvent.findFirst({
    where: { userId, verified: true, date: tomorrow, type: { in: ['HOLIDAY', 'VACATION'] } },
  });
  if (holidayTomorrow) {
    created.push(
      await deliver(userId, {
        type: 'HOLIDAY_TOMORROW',
        title: 'College holiday tomorrow',
        message: `${holidayTomorrow.title || 'Holiday'} on ${DAY_NAMES[tomorrow.getUTCDay()]}. No classes will be counted.`,
        meta: { date: formatDateOnly(tomorrow) },
        dedupeKey: `holiday:${formatDateOnly(tomorrow)}`,
      }),
    );
  }

  const exam = await prisma.academicCalendarEvent.findFirst({
    where: {
      userId,
      verified: true,
      type: 'EXAM',
      date: { gte: todayDateOnly(), lte: addDays(todayDateOnly(), 7) },
    },
    orderBy: { date: 'asc' },
  });
  if (exam) {
    created.push(
      await deliver(userId, {
        type: 'EXAM_APPROACHING',
        title: 'Exam coming up',
        message: `${exam.title || 'Exam'} on ${formatDateOnly(exam.date)}.`,
        meta: { date: formatDateOnly(exam.date) },
        dedupeKey: `exam:${formatDateOnly(exam.date)}`,
      }),
    );
  }

  const next = await getNextSession(userId);
  if (next && next.date === today) {
    created.push(
      await deliver(userId, {
        type: 'UPCOMING_CLASS',
        title: `${next.subject.name} at ${next.startTime}`,
        message: `Next up today: ${next.subject.name} ${next.startTime}–${next.endTime}.`,
        meta: { sessionId: next.id },
        dedupeKey: `next:${next.id}`,
      }),
    );
  }

  const unmarkedYesterday = await prisma.attendanceSession.findMany({
    where: { userId, status: 'PENDING', date: addDays(todayDateOnly(), -1) },
    include: { subject: { select: { name: true } } },
  });
  for (const session of unmarkedYesterday) {
    created.push(
      await deliver(userId, {
        type: 'MISSED_CLASS',
        title: `Mark yesterday's ${session.subject.name}`,
        message: `${session.subject.name} at ${session.startTime} is still unmarked.`,
        meta: { sessionId: session.id },
        dedupeKey: `unmarked:${session.id}`,
      }),
    );
  }

  return created.filter(Boolean);
}

export function notifyReschedule(userId, { subjectName, from, to }) {
  return deliver(userId, {
    type: 'CLASS_RESCHEDULED',
    title: `${subjectName} moved`,
    message: `${subjectName} moved from ${from} to ${to}.`,
    meta: { subjectName, from, to },
    dedupeKey: `resched:${subjectName}:${from}:${to}`,
  });
}
