export class ApiError extends Error {
  constructor(status, message, code = undefined, details = undefined) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message, details) {
    return new ApiError(400, message, 'BAD_REQUEST', details);
  }
  static unauthorized(message = 'Sign in to continue') {
    return new ApiError(401, message, 'UNAUTHORIZED');
  }
  static forbidden(message = 'You do not have access to this resource') {
    return new ApiError(403, message, 'FORBIDDEN');
  }
  static notFound(message = 'Not found') {
    return new ApiError(404, message, 'NOT_FOUND');
  }
  static conflict(message, details) {
    return new ApiError(409, message, 'CONFLICT', details);
  }
  static unprocessable(message, details) {
    return new ApiError(422, message, 'UNPROCESSABLE', details);
  }
  static serviceUnavailable(message) {
    return new ApiError(503, message, 'SERVICE_UNAVAILABLE');
  }
}

/** Wraps an async route handler so rejected promises reach the error middleware. */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
