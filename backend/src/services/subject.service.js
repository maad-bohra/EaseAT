import { prisma } from '../lib/prisma.js';
import { ApiError } from '../utils/ApiError.js';

export function listSubjects(userId, { includeArchived = false } = {}) {
  return prisma.subject.findMany({
    where: { userId, ...(includeArchived ? {} : { archived: false }) },
    orderBy: { name: 'asc' },
    include: { _count: { select: { timetableEntries: true, sessions: true } } },
  });
}

export async function getSubject(userId, id) {
  const subject = await prisma.subject.findFirst({ where: { id, userId } });
  if (!subject) throw ApiError.notFound('That subject was not found');
  return subject;
}

export function createSubject(userId, data) {
  return prisma.subject.create({ data: { ...data, userId } });
}

export async function updateSubject(userId, id, data) {
  await getSubject(userId, id);
  return prisma.subject.update({ where: { id }, data });
}

/**
 * Deleting a subject cascades to its timetable entries and sessions, so the
 * client is told how much history is about to disappear.
 */
export async function deleteSubject(userId, id) {
  await getSubject(userId, id);
  const sessions = await prisma.attendanceSession.count({ where: { userId, subjectId: id } });
  await prisma.subject.delete({ where: { id } });
  return { deletedSessions: sessions };
}
