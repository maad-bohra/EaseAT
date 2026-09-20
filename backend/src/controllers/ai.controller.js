import * as aiService from '../services/ai/ai.service.js';
import * as timetableService from '../services/timetable.service.js';
import { asyncHandler } from '../utils/ApiError.js';

export const status = asyncHandler(async (_req, res) => {
  res.json({ enabled: aiService.isAiEnabled() });
});

export const ask = asyncHandler(async (req, res) => {
  const { question, history = [] } = req.body;
  res.json(await aiService.askAssistant(req.user.id, question, history));
});

/** Returns the same figures the assistant sees, with no AI call involved. */
export const facts = asyncHandler(async (req, res) => {
  res.json(await aiService.assistantFacts(req.user.id, req.query.subjectId));
});

/** Parses free text into a preview. Nothing is saved until /timetable/bulk. */
export const parseTimetable = asyncHandler(async (req, res) => {
  const draft = await aiService.parseTimetableText(req.user.id, req.body.text);
  res.json({ draft, requiresConfirmation: true });
});

/** Confirms a parsed preview: creates any new subjects, then the slots. */
export const confirmTimetable = asyncHandler(async (req, res) => {
  const entries = await timetableService.createEntries(req.user.id, req.body.entries);
  res.status(201).json({ entries, created: entries.length });
});
