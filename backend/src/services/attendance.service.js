import { prisma } from '../lib/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { buildPrediction, percentage, riskLevel } from './attendance-math.service.js';
import { serializeSession } from './session.service.js';
import { toDateOnly, todayDateOnly, addDays, formatDateOnly, timeToMinutes } from '../utils/dates.js';

/** Counts PRESENT/ABSENT/CANCELLED/PENDING per subject in one grouped query. */
async function countsBySubject(userId, { from, to } = {}) {
  const where = { userId };
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = toDateOnly(from);
    if (to) where.date.lte = toDateOnly(to);
  }

  const grouped = await prisma.attendanceSession.groupBy({
    by: ['subjectId', 'status'],
    where,
    _count: { _all: true },
  });

  const map = new Map();
  for (const row of grouped) {
    const current = map.get(row.subjectId) || {
      present: 0,
      absent: 0,
      cancelled: 0,
      pending: 0,
      noClass: 0,
    };
    const count = row._count._all;
    if (row.status === 'PRESENT') current.present += count;
    else if (row.status === 'ABSENT') current.absent += count;
    else if (row.status === 'CANCELLED') current.cancelled += count;
    else if (row.status === 'PENDING') current.pending += count;
    else current.noClass += count;
    map.set(row.subjectId, current);
  }
  return map;
}

function requirementFor(subject, user) {
  return subject.requiredAttendance ?? user.requiredAttendance;
}

/** Overall + per subject figures for the dashboard. */
export async function getSummary(userId, range = {}) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { requiredAttendance: true },
  });
  const subjects = await prisma.subject.findMany({
    where: { userId, archived: false },
    orderBy: { name: 'asc' },
  });
  const counts = await countsBySubject(userId, range);

  const bySubject = subjects.map((subject) => {
    const c = counts.get(subject.id) || { present: 0, absent: 0, cancelled: 0, pending: 0, noClass: 0 };
    const required = requirementFor(subject, user);
    const counted = c.present + c.absent;
    const current = percentage(c.present, c.absent);
    return {
      subjectId: subject.id,
      name: subject.name,
      code: subject.code,
      color: subject.color,
      faculty: subject.faculty,
      credits: subject.credits,
      required,
      present: c.present,
      absent: c.absent,
      cancelled: c.cancelled,
      pending: c.pending,
      counted,
      percentage: current,
      status: riskLevel(current, required, counted),
    };
  });

  const totals = bySubject.reduce(
    (acc, s) => ({
      present: acc.present + s.present,
      absent: acc.absent + s.absent,
      cancelled: acc.cancelled + s.cancelled,
      pending: acc.pending + s.pending,
    }),
    { present: 0, absent: 0, cancelled: 0, pending: 0 },
  );

  const overallCounted = totals.present + totals.absent;
  const overall = percentage(totals.present, totals.absent);

  return {
    overall: {
      percentage: overall,
      required: user.requiredAttendance,
      attended: totals.present,
      missed: totals.absent,
      cancelled: totals.cancelled,
      pending: totals.pending,
      totalCounted: overallCounted,
      status: riskLevel(overall, user.requiredAttendance, overallCounted),
    },
    subjects: bySubject,
    warnings: bySubject.filter((s) => s.status === 'BELOW' || s.status === 'AT_RISK'),
  };
}

/** "How many classes can I miss?" - deterministic, for one subject. */
export async function getSubjectPrediction(userId, subjectId, { target } = {}) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { requiredAttendance: true },
  });
  const subject = await prisma.subject.findFirst({ where: { id: subjectId, userId } });
  if (!subject) throw ApiError.notFound('That subject was not found');

  const counts = (await countsBySubject(userId)).get(subjectId) || { present: 0, absent: 0 };
  const required = requirementFor(subject, user);
  const targets = target ? [target] : [Math.max(required, 75), 80, 85];

  const prediction = buildPrediction({
    present: counts.present,
    absent: counts.absent,
    required,
    targets: [...new Set(targets)],
  });

  const upcoming = await prisma.attendanceSession.count({
    where: { userId, subjectId, status: 'PENDING', date: { gte: todayDateOnly() } },
  });

  return {
    subject: { id: subject.id, name: subject.name, code: subject.code, color: subject.color },
    ...prediction,
    upcomingScheduled: upcoming,
    message: buildPredictionMessage(subject.name, prediction),
  };
}

function buildPredictionMessage(subjectName, p) {
  if (p.counted === 0) return `No ${subjectName} classes have been marked yet.`;
  if (p.current < p.required) {
    return p.needToAttend === null
      ? `${subjectName} is at ${p.current}% and cannot reach ${p.required}%.`
      : `Attend the next ${p.needToAttend} ${subjectName} ${
          p.needToAttend === 1 ? 'class' : 'classes'
        } to get back to ${p.required}%.`;
  }
  return `You can miss ${p.canMiss} upcoming ${subjectName} ${
    p.canMiss === 1 ? 'class' : 'classes'
  } and stay above ${p.required}%.`;
}

/** Prediction for every subject at once (dashboard strip). */
export async function getAllPredictions(userId) {
  const subjects = await prisma.subject.findMany({
    where: { userId, archived: false },
    select: { id: true },
    orderBy: { name: 'asc' },
  });
  return Promise.all(subjects.map((s) => getSubjectPrediction(userId, s.id)));
}

export async function getTodayAndUpcoming(userId, upcomingDays = 7) {
  const today = todayDateOnly();
  const sessions = await prisma.attendanceSession.findMany({
    where: { userId, date: { gte: today, lte: addDays(today, upcomingDays) } },
    include: {
      subject: { select: { id: true, name: true, code: true, color: true } },
      timetableEntry: { select: { classroom: true, faculty: true } },
    },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  });

  const todayKey = formatDateOnly(today);
  const serialized = sessions.map(serializeSession);

  return {
    today: serialized.filter((s) => s.date === todayKey),
    upcoming: serialized.filter((s) => s.date > todayKey),
  };
}

/** The next class that has not happened yet, used by notifications and the assistant. */
export async function getNextSession(userId) {
  const today = todayDateOnly();
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const candidates = await prisma.attendanceSession.findMany({
    where: { userId, status: { in: ['PENDING'] }, date: { gte: today } },
    include: { subject: { select: { id: true, name: true, code: true, color: true } } },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    take: 20,
  });

  const next = candidates.find(
    (s) => formatDateOnly(s.date) > formatDateOnly(today) || timeToMinutes(s.startTime) >= nowMinutes,
  );
  return next ? serializeSession(next) : null;
}
