/**
 * Custom Operational Application Error
 * 
 * Extends JavaScript's standard Error to carry HTTP status codes,
 * operational flags (distinguishing planned user/validation errors from unexpected crashes),
 * and structured error details.
 */
export class AppError extends Error {
  /**
   * @param {string} message - Human-readable error message
   * @param {number} [statusCode=500] - HTTP status code
   * @param {any} [errors=null] - Optional detailed validation or constraint errors
   */
  constructor(message, statusCode = 500, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.errors = errors;

    Error.captureStackTrace(this, this.constructor);
  }
}

