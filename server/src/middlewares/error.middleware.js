import { config } from '../config/env.js';

/**
 * Global Error Handling Middleware
 * 
 * Intercepts uncaught exceptions, Prisma database constraints (P2002 duplicate keys, P2003 foreign keys),
 * and JWT auth errors, formatting them into structured, safe JSON responses.
 */
export const errorHandler = (err, req, res, next) => {

  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;

  // Handle Prisma Known Request Errors
  if (err.code === 'P2002') {
    const target = err.meta?.target ? `Duplicate field: ${err.meta.target}` : 'Unique constraint violation';
    error.statusCode = 409;
    error.message = `Database conflict: ${target}. A record with this value already exists.`;
  } else if (err.code === 'P2003') {
    error.statusCode = 400;
    error.message = 'Foreign key constraint failed. Related record does not exist.';
  } else if (err.code === 'P2025') {
    error.statusCode = 404;
    error.message = 'Record requested for operation does not exist in database.';
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    error.statusCode = 401;
    error.message = 'Invalid authentication token. Please log in again.';
  } else if (err.name === 'TokenExpiredError') {
    error.statusCode = 401;
    error.message = 'Authentication token expired. Please refresh or re-login.';
  }

  // Log non-operational errors for observability
  if (!err.isOperational && config.nodeEnv !== 'test') {
    console.error('💥 UNHANDLED SERVER ERROR:', err);
  }

  res.status(error.statusCode).json({
    success: false,
    status: error.status || 'error',
    message: error.message || 'Internal Server Error',
    errors: error.errors || null,
    stack: config.nodeEnv === 'development' ? err.stack : undefined,
  });
};
