import { Prisma } from '@prisma/client';
import { ApiError } from '../utils/ApiError.js';
import { isProd } from '../config/env.js';

export function notFoundHandler(req, _res, next) {
  next(ApiError.notFound(`No route for ${req.method} ${req.originalUrl}`));
}

/** Single place where every error becomes a predictable JSON body. */
export function errorHandler(err, _req, res, _next) {
  let status = err.status || 500;
  let message = err.message || 'Something went wrong';
  let code = err.code;
  let details = err.details;

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      status = 409;
      code = 'DUPLICATE';
      message = 'That record already exists';
      details = { fields: err.meta?.target };
    } else if (err.code === 'P2025') {
      status = 404;
      code = 'NOT_FOUND';
      message = 'Record not found';
    } else {
      status = 400;
      code = 'DATABASE_ERROR';
      message = 'The database rejected that request';
    }
  }

  if (err?.code === 'LIMIT_FILE_SIZE') {
    status = 413;
    message = 'That file is too large';
  }

  if (status >= 500) {
    console.error(err);
    if (isProd) message = 'Something went wrong';
  }

  res.status(status).json({
    error: { message, code: code || 'ERROR', ...(details ? { details } : {}) },
  });
}
