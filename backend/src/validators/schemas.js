import { z } from 'zod';

export const uuid = z.string().uuid('That id is not valid');
export const idParam = z.object({ id: uuid });

const time = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use a 24-hour time like 09:00');
const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a date like 2026-09-21');
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a colour like #2F6F4E');

export const attendanceStatus = z.enum(['PENDING', 'PRESENT', 'ABSENT', 'CANCELLED', 'NO_CLASS']);
export const calendarEventType = z.enum([
  'HOLIDAY',
  'WORKING_DAY',
  'EXAM',
  'VACATION',
  'SEMESTER_START',
  'SEMESTER_END',
  'OTHER',
]);

/* --- auth --- */
export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(80),
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(8, 'Use at least 8 characters').max(128),
  semester: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(1).max(8).optional(),
  collegeName: z.string().trim().max(120).optional(),
  requiredAttendance: z.coerce.number().min(1).max(100).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
});

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  semester: z.coerce.number().int().min(1).max(12).nullable().optional(),
  year: z.coerce.number().int().min(1).max(8).nullable().optional(),
  collegeName: z.string().trim().max(120).nullable().optional(),
  requiredAttendance: z.coerce.number().min(1).max(100).optional(),
});

export const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password'),
  newPassword: z.string().min(8, 'Use at least 8 characters').max(128),
});

/* --- subjects --- */
export const subjectSchema = z.object({
  name: z.string().trim().min(1, 'Name the subject').max(80),
  code: z.string().trim().max(20).optional().nullable(),
  faculty: z.string().trim().max(80).optional().nullable(),
  credits: z.coerce.number().int().min(0).max(20).optional().nullable(),
  color: hexColor.optional(),
  icon: z.string().trim().max(24).optional().nullable(),
  requiredAttendance: z.coerce.number().min(1).max(100).optional().nullable(),
});
export const subjectUpdateSchema = subjectSchema.partial().extend({
  archived: z.boolean().optional(),
});

/* --- timetable --- */
export const timetableSchema = z.object({
  subjectId: uuid,
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: time,
  endTime: time,
  classroom: z.string().trim().max(40).optional().nullable(),
  faculty: z.string().trim().max(80).optional().nullable(),
  effectiveFrom: dateOnly.optional().nullable(),
  effectiveTo: dateOnly.optional().nullable(),
});
export const timetableUpdateSchema = timetableSchema.partial().extend({
  active: z.boolean().optional(),
});

export const timetableBulkSchema = z.object({
  entries: z.array(timetableSchema).min(1, 'Add at least one class').max(60),
});

/* --- attendance --- */
export const sessionQuerySchema = z.object({
  from: dateOnly.optional(),
  to: dateOnly.optional(),
  subjectId: uuid.optional(),
  status: attendanceStatus.optional(),
});

export const sessionCreateSchema = z.object({
  subjectId: uuid,
  date: dateOnly,
  startTime: time,
  endTime: time,
  status: attendanceStatus.optional(),
  notes: z.string().trim().max(300).optional().nullable(),
});

export const sessionUpdateSchema = z
  .object({
    status: attendanceStatus.optional(),
    notes: z.string().trim().max(300).optional().nullable(),
  })
  .refine((v) => v.status !== undefined || v.notes !== undefined, {
    message: 'Nothing to update',
  });

export const bulkMarkSchema = z.object({
  sessionIds: z.array(uuid).min(1).max(100),
  status: attendanceStatus,
});

export const rescheduleSchema = z.object({
  date: dateOnly,
  startTime: time,
  endTime: time,
  reason: z.string().trim().max(200).optional(),
});

export const generateSchema = z.object({
  from: dateOnly,
  to: dateOnly,
});

export const predictionQuerySchema = z.object({
  target: z.coerce.number().min(1).max(100).optional(),
});

/* --- calendar --- */
export const calendarQuerySchema = z.object({
  from: dateOnly.optional(),
  to: dateOnly.optional(),
  verified: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

export const calendarEventSchema = z.object({
  date: dateOnly,
  type: calendarEventType,
  title: z.string().trim().max(120).optional().nullable(),
  description: z.string().trim().max(300).optional().nullable(),
  verified: z.boolean().optional(),
});
export const calendarUpdateSchema = calendarEventSchema.partial();

export const verifySchema = z.object({
  ids: z.array(uuid).min(1, 'Select at least one date').max(500),
});

/* --- ai --- */
export const assistantSchema = z.object({
  question: z.string().trim().min(2, 'Ask a question').max(500),
  history: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(2000) }))
    .max(20)
    .optional(),
});

export const nlTimetableSchema = z.object({
  text: z.string().trim().min(5, 'Describe your timetable').max(2000),
});

/* --- notifications --- */
export const notificationQuerySchema = z.object({
  unreadOnly: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const dayQuerySchema = z.object({ date: dateOnly });

export const monthQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});
