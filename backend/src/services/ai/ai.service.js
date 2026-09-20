import { complete, parseJsonReply, isAiEnabled } from './llm.client.js';
import { ApiError } from '../../utils/ApiError.js';
import { prisma } from '../../lib/prisma.js';
import { DAY_NAMES, formatDateOnly, todayDateOnly, addDays } from '../../utils/dates.js';
import {
  getSummary,
  getSubjectPrediction,
  getAllPredictions,
  getTodayAndUpcoming,
} from '../attendance.service.js';
import { getWeeklyTimetable } from '../timetable.service.js';
import { listEvents, getUpcomingHolidays } from '../calendar.service.js';

const CALENDAR_TYPES = [
  'HOLIDAY',
  'WORKING_DAY',
  'EXAM',
  'VACATION',
  'SEMESTER_START',
  'SEMESTER_END',
  'OTHER',
];

export { isAiEnabled };

/* ------------------------------------------------------------------ */
/* 1. Academic calendar extraction                                     */
/* ------------------------------------------------------------------ */

const CALENDAR_SYSTEM = `You read academic calendars from Indian colleges and return structured dates.

Return ONLY a JSON array. Each element:
{"date":"YYYY-MM-DD","type":"HOLIDAY|WORKING_DAY|EXAM|VACATION|SEMESTER_START|SEMESTER_END|OTHER","title":"short name","description":"optional detail"}

Rules:
- Expand date ranges into one element per calendar date.
- A compensatory or instructional working Saturday is WORKING_DAY.
- Study/preparation leave and term breaks are VACATION.
- If a year is missing, infer it from surrounding context; never guess wildly.
- Skip anything you cannot map to a concrete date.
- No prose, no code fences, JSON array only.`;

/** Turns extracted PDF text into candidate calendar rows. Never writes to attendance. */
export async function extractCalendarEvents(text) {
  const excerpt = text.slice(0, 60000);
  const reply = await complete({
    system: CALENDAR_SYSTEM,
    messages: [
      { role: 'user', content: `Academic calendar text:\n\n${excerpt}` },
      { role: 'assistant', content: '[' },
    ],
    maxTokens: 4000,
  });

  const parsed = parseJsonReply(reply.startsWith('[') ? reply : `[${reply}`);
  if (!Array.isArray(parsed)) throw ApiError.unprocessable('The AI reply could not be read');

  const seen = new Set();
  return parsed
    .filter((row) => /^\d{4}-\d{2}-\d{2}$/.test(row?.date || ''))
    .map((row) => ({
      date: row.date,
      type: CALENDAR_TYPES.includes(row.type) ? row.type : 'OTHER',
      title: (row.title || '').toString().slice(0, 120) || null,
      description: row.description ? row.description.toString().slice(0, 300) : null,
    }))
    .filter((row) => {
      const key = `${row.date}|${row.type}|${row.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/* ------------------------------------------------------------------ */
/* 2. Natural-language timetable entry                                 */
/* ------------------------------------------------------------------ */

const TIMETABLE_SYSTEM = `You convert a student's description of their weekly timetable into structured slots.

Return ONLY a JSON array. Each element:
{"subject":"exact subject name","dayOfWeek":0-6,"startTime":"HH:mm","endTime":"HH:mm","classroom":null,"faculty":null}

Rules:
- 0 = Sunday, 1 = Monday ... 6 = Saturday.
- 24-hour times. "2 PM" is "14:00".
- If no end time is given, assume the class is one hour long.
- The same subject can appear twice on the same day at different times. Emit both.
- Match subject names to the student's existing subjects when they clearly correspond; otherwise keep the name the student used.
- No prose, JSON array only.`;

/**
 * Parses free text into draft slots. Nothing is written to the database here -
 * the student confirms the preview first.
 */
export async function parseTimetableText(userId, text) {
  const subjects = await prisma.subject.findMany({
    where: { userId, archived: false },
    select: { id: true, name: true, code: true },
  });

  const reply = await complete({
    system: TIMETABLE_SYSTEM,
    messages: [
      {
        role: 'user',
        content: `Existing subjects: ${JSON.stringify(subjects.map((s) => s.name))}\n\nDescription: ${text}`,
      },
      { role: 'assistant', content: '[' },
    ],
    maxTokens: 2000,
  });

  const parsed = parseJsonReply(reply.startsWith('[') ? reply : `[${reply}`);
  const byName = new Map(subjects.map((s) => [s.name.toLowerCase(), s]));

  return parsed
    .filter(
      (row) =>
        Number.isInteger(row?.dayOfWeek) &&
        row.dayOfWeek >= 0 &&
        row.dayOfWeek <= 6 &&
        /^\d{2}:\d{2}$/.test(row?.startTime || ''),
    )
    .map((row) => {
      const match = byName.get((row.subject || '').toLowerCase().trim());
      return {
        subjectName: row.subject,
        subjectId: match?.id ?? null,
        isNewSubject: !match,
        dayOfWeek: row.dayOfWeek,
        day: DAY_NAMES[row.dayOfWeek],
        startTime: row.startTime,
        endTime: /^\d{2}:\d{2}$/.test(row?.endTime || '')
          ? row.endTime
          : addOneHour(row.startTime),
        classroom: row.classroom || null,
        faculty: row.faculty || null,
      };
    });
}

function addOneHour(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return `${String((h + 1) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/* ------------------------------------------------------------------ */
/* 3. Grounded attendance assistant                                    */
/* ------------------------------------------------------------------ */

/**
 * Deterministic data the assistant is allowed to talk about. Every number the
 * model sees comes from the attendance engine; the model only phrases it.
 */
export async function buildAssistantContext(userId) {
  const today = todayDateOnly();
  const [summary, predictions, schedule, timetable, holidays, events] = await Promise.all([
    getSummary(userId),
    getAllPredictions(userId),
    getTodayAndUpcoming(userId, 7),
    getWeeklyTimetable(userId),
    getUpcomingHolidays(userId, 30),
    listEvents(userId, {
      from: today,
      to: addDays(today, 7),
      verified: true,
    }),
  ]);

  return {
    today: formatDateOnly(today),
    todayName: DAY_NAMES[today.getUTCDay()],
    tomorrow: formatDateOnly(addDays(today, 1)),
    overall: summary.overall,
    subjects: summary.subjects.map((s) => ({
      name: s.name,
      code: s.code,
      percentage: s.percentage,
      required: s.required,
      present: s.present,
      absent: s.absent,
      cancelled: s.cancelled,
      status: s.status,
    })),
    predictions: predictions.map((p) => ({
      subject: p.subject.name,
      current: p.current,
      required: p.required,
      canMiss: p.canMiss,
      needToAttend: p.needToAttend,
      projections: p.projections,
      targets: p.targets,
    })),
    todaysClasses: schedule.today,
    upcomingClasses: schedule.upcoming.slice(0, 20),
    weeklyTimetable: timetable.map((d) => ({
      day: d.day,
      classes: d.entries.map((e) => ({
        subject: e.subject.name,
        start: e.startTime,
        end: e.endTime,
        room: e.classroom,
      })),
    })),
    upcomingHolidays: holidays,
    calendarNextWeek: events,
  };
}

const ASSISTANT_SYSTEM = `You are the attendance assistant inside EaseAT, a student attendance app.

You are given a JSON snapshot of this student's real data. Answer using ONLY that snapshot.

Hard rules:
- Never invent or recompute attendance numbers, percentages, or "classes you can miss". Those are already computed in the snapshot; quote them.
- If the snapshot does not contain the answer, say what is missing and what the student should add to the app.
- A cancelled class is not an absence. A holiday is not a missed class.
- The same subject can appear more than once on a day; treat each class time separately.
- Be brief and concrete: two or three sentences, times in 24-hour format, no bullet lists unless listing classes.
- Do not claim to have changed anything in the app. You can only read.`;

export async function askAssistant(userId, question, history = []) {
  const context = await buildAssistantContext(userId);

  const messages = [
    ...history.slice(-6).map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content).slice(0, 2000),
    })),
    {
      role: 'user',
      content: `Student data snapshot:\n${JSON.stringify(context)}\n\nQuestion: ${question}`,
    },
  ];

  const answer = await complete({
    system: ASSISTANT_SYSTEM,
    messages,
    maxTokens: 800,
    temperature: 0.2,
  });

  return { answer, groundedOn: Object.keys(context) };
}

/** Exposed so the assistant page can show the same figures without an AI call. */
export async function assistantFacts(userId, subjectId) {
  if (subjectId) return getSubjectPrediction(userId, subjectId);
  return buildAssistantContext(userId);
}
