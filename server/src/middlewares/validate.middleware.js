import { AppError } from '../utils/appError.js';

/**
 * Zod Schema Validation Middleware
 * 
 * Validates request payload (`body`, `query`, or `params`) against a Zod schema.
 * Replaces request target with sanitized and parsed values.
 * 
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @param {'body'|'query'|'params'} [source='body'] - Target request property
 */
export const validate = (schema, source = 'body') => {

  return (req, res, next) => {
    try {
      const parsed = schema.parse(req[source]);
      req[source] = parsed;
      next();
    } catch (err) {
      if (err.errors) {
        const errorMessages = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
        return next(new AppError(`Validation failed: ${errorMessages}`, 400, err.errors));
      }
      next(err);
    }
  };
};
