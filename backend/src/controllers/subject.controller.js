import * as subjectService from '../services/subject.service.js';
import { asyncHandler } from '../utils/ApiError.js';

export const list = asyncHandler(async (req, res) => {
  res.json({ subjects: await subjectService.listSubjects(req.user.id) });
});

export const get = asyncHandler(async (req, res) => {
  res.json({ subject: await subjectService.getSubject(req.user.id, req.params.id) });
});

export const create = asyncHandler(async (req, res) => {
  res.status(201).json({ subject: await subjectService.createSubject(req.user.id, req.body) });
});

export const update = asyncHandler(async (req, res) => {
  res.json({ subject: await subjectService.updateSubject(req.user.id, req.params.id, req.body) });
});

export const remove = asyncHandler(async (req, res) => {
  const result = await subjectService.deleteSubject(req.user.id, req.params.id);
  res.json({ message: 'Subject deleted', ...result });
});
