/**
 * Global Error Handler Middleware
 */

import { sendError } from '../utils/apiResponse.js';

export const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  const requestId = req.id || 'unknown';

  console.error('❌ Error:', {
    requestId,
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
  });

  if (err.name === 'CastError') {
    error.message = `Invalid ID: ${err.value}`;
    return sendError(res, 400, 'INVALID_ID', error.message);
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    error.message = `${field} already exists`;
    return sendError(res, 409, 'DUPLICATE_KEY', error.message, { field });
  }

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return sendError(res, 400, 'VALIDATION_ERROR', messages.join('. '), { fields: Object.keys(err.errors || {}) });
  }

  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 401, 'INVALID_TOKEN', 'Invalid token');
  }
  if (err.name === 'TokenExpiredError') {
    return sendError(res, 401, 'TOKEN_EXPIRED', 'Token expired');
  }

  const statusCode = err.statusCode || 500;
  const details = process.env.NODE_ENV === 'development' ? { stack: err.stack, requestId } : { requestId };
  return sendError(res, statusCode, err.code || 'INTERNAL_SERVER_ERROR', error.message || 'Internal Server Error', details);
};

/**
 * Async error wrapper - wraps async route handlers
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
