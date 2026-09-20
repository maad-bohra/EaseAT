import { createRequire } from 'node:module';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { storage, buildKey } from './storage/storage.service.js';
import { extractCalendarEvents, isAiEnabled } from './ai/ai.service.js';
import { createExtractedEvents } from './calendar.service.js';

// pdf-parse ships as CommonJS and runs a debug block on ESM default import.
const require = createRequire(import.meta.url);

async function extractPdfText(buffer) {
  const pdfParse = require('pdf-parse/lib/pdf-parse.js');
  const result = await pdfParse(buffer);
  const text = (result.text || '').replace(/\u0000/g, '').trim();
  if (!text) {
    throw ApiError.unprocessable(
      'No text could be read from that PDF. It may be a scan - try a text-based PDF.',
    );
  }
  return text;
}

export function listUploads(userId) {
  return prisma.uploadedFile.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      originalName: true,
      sizeBytes: true,
      status: true,
      error: true,
      createdAt: true,
      _count: { select: { events: true } },
    },
  });
}

/**
 * Stores the PDF, extracts its text, and - when the AI layer is configured -
 * turns it into unverified calendar rows for the student to review.
 */
export async function uploadAcademicCalendar(userId, file) {
  if (file.mimetype !== 'application/pdf') {
    throw ApiError.badRequest('Upload a PDF file');
  }

  const key = buildKey(userId, file.originalname);
  const { storageKey, publicUrl } = await storage.save({
    buffer: file.buffer,
    key,
    mimeType: file.mimetype,
  });

  const record = await prisma.uploadedFile.create({
    data: {
      userId,
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      storageKey,
      publicUrl,
      status: 'UPLOADED',
    },
  });

  let text;
  try {
    text = await extractPdfText(file.buffer);
    await prisma.uploadedFile.update({
      where: { id: record.id },
      data: { extractedText: text.slice(0, 200000), status: 'TEXT_EXTRACTED' },
    });
  } catch (err) {
    await prisma.uploadedFile.update({
      where: { id: record.id },
      data: { status: 'FAILED', error: err.message },
    });
    throw err;
  }

  if (!isAiEnabled()) {
    return {
      file: { id: record.id, originalName: record.originalName, status: 'TEXT_EXTRACTED' },
      events: [],
      aiEnabled: false,
      message:
        'The file was saved and its text read. Automatic date extraction needs the AI key; you can add holidays by hand meanwhile.',
    };
  }

  try {
    const extracted = await extractCalendarEvents(text);
    const events = await createExtractedEvents(userId, extracted, record.id);
    await prisma.uploadedFile.update({ where: { id: record.id }, data: { status: 'AI_PARSED' } });

    return {
      file: { id: record.id, originalName: record.originalName, status: 'AI_PARSED' },
      events: events.filter((e) => e.fileId === record.id),
      aiEnabled: true,
      message: `${extracted.length} dates found. Review them before they affect your attendance.`,
    };
  } catch (err) {
    await prisma.uploadedFile.update({
      where: { id: record.id },
      data: { status: 'FAILED', error: err.message },
    });
    throw err;
  }
}

export async function deleteUpload(userId, id) {
  const file = await prisma.uploadedFile.findFirst({ where: { id, userId } });
  if (!file) throw ApiError.notFound('That file was not found');
  await storage.remove(file.storageKey).catch(() => {});
  await prisma.uploadedFile.delete({ where: { id } });
}
