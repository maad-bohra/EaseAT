import { ApiError } from '../utils/ApiError.js';

/**
 * Validates req.body / req.query / req.params against zod schemas and replaces
 * them with the parsed result, so controllers always receive clean data.
 */
export const validate = (schemas) => (req, _res, next) => {
  try {
    for (const key of ['body', 'query', 'params']) {
      if (!schemas[key]) continue;
      const result = schemas[key].safeParse(req[key]);
      if (!result.success) {
        const details = result.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        }));
        throw ApiError.badRequest('Check the highlighted fields and try again', details);
      }
      if (key === 'query') {
        req.validatedQuery = result.data;
      } else {
        req[key] = result.data;
      }
    }
    next();
  } catch (err) {
    next(err);
  }
};
