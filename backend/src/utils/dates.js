/**
 * Every date that identifies a class day is stored as a PostgreSQL DATE.
 * To keep that free of timezone drift, dates are always built at UTC midnight
 * and formatted back as plain "YYYY-MM-DD" strings.
 */

export function toDateOnly(value) {
  if (value instanceof Date) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) throw new Error(`Invalid date: ${value}`);
  return new Date(Date.UTC(y, m - 1, d));
}

export function formatDateOnly(date) {
  return toDateOnly(date).toISOString().slice(0, 10);
}

export function addDays(date, days) {
  const d = toDateOnly(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/** 0 = Sunday ... 6 = Saturday, matching TimetableEntry.dayOfWeek. */
export function dayOfWeek(date) {
  return toDateOnly(date).getUTCDay();
}

export function eachDateInRange(from, to) {
  const out = [];
  let cursor = toDateOnly(from);
  const end = toDateOnly(to);
  while (cursor <= end) {
    out.push(new Date(cursor));
    cursor = addDays(cursor, 1);
  }
  return out;
}

export function startOfMonth(year, month /* 1-12 */) {
  return new Date(Date.UTC(year, month - 1, 1));
}

export function endOfMonth(year, month) {
  return new Date(Date.UTC(year, month, 0));
}

export function todayDateOnly() {
  return toDateOnly(new Date());
}

/** "HH:mm" -> minutes since midnight, used for ordering and "next class". */
export function timeToMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function compareSessions(a, b) {
  const d = formatDateOnly(a.date).localeCompare(formatDateOnly(b.date));
  return d !== 0 ? d : timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
}

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
