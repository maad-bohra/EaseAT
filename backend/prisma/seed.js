/**
 * Seeds a demo student whose Monday contains two separate DSA classes, which is
 * the scenario the whole data model is built around.
 *
 * Run: npm run seed
 * Login: demo@attendly.app / demo1234
 */
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

const SUBJECTS = [
  { name: 'DSA', code: 'CS301', faculty: 'Dr. R. Iyer', credits: 4, color: '#2F6F4E' },
  { name: 'DBMS', code: 'CS302', faculty: 'Prof. S. Nair', credits: 4, color: '#3A6EA5' },
  { name: 'OS', code: 'CS303', faculty: 'Dr. M. Rao', credits: 3, color: '#8A5A2B' },
  { name: 'CN', code: 'CS304', faculty: 'Prof. A. Das', credits: 3, color: '#7A3E7E' },
];

// 1 = Monday ... 5 = Friday. Note DSA twice on Monday, at 09:00 and 14:00.
const TIMETABLE = [
  ['DSA', 1, '09:00', '10:00', 'LH-3'],
  ['DBMS', 1, '10:00', '11:00', 'LH-3'],
  ['DSA', 1, '14:00', '15:00', 'Lab-2'],
  ['OS', 1, '15:00', '16:00', 'LH-4'],
  ['DBMS', 2, '09:00', '10:00', 'LH-3'],
  ['CN', 2, '11:00', '12:00', 'LH-1'],
  ['DSA', 3, '09:00', '10:00', 'LH-3'],
  ['OS', 3, '10:00', '11:00', 'LH-4'],
  ['CN', 4, '09:00', '10:00', 'LH-1'],
  ['DSA', 4, '11:00', '12:00', 'LH-3'],
  ['DBMS', 5, '09:00', '10:00', 'LH-3'],
  ['OS', 5, '10:00', '11:00', 'LH-4'],
];

function dateOnly(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

async function main() {
  const email = 'demo@attendly.app';
  await prisma.user.deleteMany({ where: { email } });

  const user = await prisma.user.create({
    data: {
      name: 'Demo Student',
      email,
      passwordHash: await bcrypt.hash('demo1234', 10),
      semester: 5,
      year: 3,
      collegeName: 'Government College of Engineering',
      requiredAttendance: 75,
    },
  });

  const subjects = {};
  for (const subject of SUBJECTS) {
    subjects[subject.name] = await prisma.subject.create({ data: { ...subject, userId: user.id } });
  }

  for (const [name, dayOfWeek, startTime, endTime, classroom] of TIMETABLE) {
    await prisma.timetableEntry.create({
      data: {
        userId: user.id,
        subjectId: subjects[name].id,
        dayOfWeek,
        startTime,
        endTime,
        classroom,
        faculty: subjects[name].faculty,
      },
    });
  }

  const today = dateOnly(new Date());
  const holiday = new Date(today);
  holiday.setUTCDate(holiday.getUTCDate() + 3);

  await prisma.academicCalendarEvent.createMany({
    data: [
      { userId: user.id, date: holiday, type: 'HOLIDAY', title: 'College holiday', verified: true },
      {
        userId: user.id,
        date: (() => {
          const d = new Date(today);
          d.setUTCDate(d.getUTCDate() + 12);
          return d;
        })(),
        type: 'EXAM',
        title: 'Internal assessment I',
        verified: true,
      },
    ],
    skipDuplicates: true,
  });

  // Past six weeks of history, plus four weeks ahead as pending classes.
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - 42);
  const end = new Date(today);
  end.setUTCDate(end.getUTCDate() + 28);

  const entries = await prisma.timetableEntry.findMany({ where: { userId: user.id } });
  const rows = [];
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const date = dateOnly(d);
    if (date.getTime() === holiday.getTime()) continue;
    for (const entry of entries.filter((e) => e.dayOfWeek === date.getUTCDay())) {
      let status = 'PENDING';
      if (date < today) {
        const roll = Math.random();
        status = roll < 0.04 ? 'CANCELLED' : roll < 0.24 ? 'ABSENT' : 'PRESENT';
      }
      rows.push({
        userId: user.id,
        subjectId: entry.subjectId,
        timetableEntryId: entry.id,
        date,
        startTime: entry.startTime,
        endTime: entry.endTime,
        status,
        markedAt: status === 'PENDING' ? null : new Date(),
      });
    }
  }
  await prisma.attendanceSession.createMany({ data: rows, skipDuplicates: true });

  console.log(`Seeded ${rows.length} sessions for ${email} (password: demo1234)`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
