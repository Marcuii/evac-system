/**
 * @fileoverview Global Error Handler Middleware
 * @description Centralized error handling for all Express routes.
 *              Provides consistent error responses and proper logging.
 *
 * @requires ../utils/AppError - Custom error classes
 * @requires ../utils/logger - Winston logger
 *
 * @module middleware/errorHandler
 * @author Marcelino Saad
 * @version 1.0.0
 *
 * @description
 * Error Handling Flow:
 * ┌─────────────────────────────────────────────────────────────┐
 * │                    Error Handler Flow                        │
 * ├─────────────────────────────────────────────────────────────┤
 * │  1. Catch error from route/middleware                       │
 * │  2. Identify error type (operational vs programming)        │
 * │  3. Transform known errors (Mongoose, JWT, etc.)            │
 * │  4. Log error with context                                  │
 * │  5. Send appropriate response to client                     │
 * └─────────────────────────────────────────────────────────────┘
 *
 * @example
 * import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
 *
 * // Apply after all routes
 * app.use(notFoundHandler);   // Handle 404
 * app.use(errorHandler);      // Handle all errors
 */

import { AppError, NotFoundError, ValidationError, DatabaseError } from "../utils/AppError.js";
import logger from "../utils/logger.js";

/* ============================================================
 * ERROR TRANSFORMERS
 * Convert third-party errors to AppError format
 * ============================================================ */

/**
 * Handle Mongoose CastError (invalid ObjectId).
 * @param {Error} err - Mongoose CastError
 * @returns {AppError} Transformed error
 */
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400, "INVALID_ID", true, {
    field: err.path,
    value: err.value,
  });
};

/**
 * Handle Mongoose duplicate key error.
 * @param {Error} err - Mongoose error with code 11000
 * @returns {AppError} Transformed error
 */
const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyValue || {})[0] || "field";
  const value = err.keyValue?.[field] || "unknown";
  const message = `Duplicate value for '${field}': '${value}'`;
  return new AppError(message, 409, "DUPLICATE_FIELD", true, {
    field,
    value,
  });
};

/**
 * Handle Mongoose validation error.
 * @param {Error} err - Mongoose ValidationError
 * @returns {ValidationError} Transformed error
 */
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors || {}).map((e) => ({
    field: e.path,
    message: e.message,
    value: e.value,
  }));
  return new ValidationError("Validation failed", errors);
};

/**
 * Handle JWT invalid token error.
 * @returns {AppError} Transformed error
 */
const handleJWTError = () => {
  return new AppError("Invalid token. Please authenticate again.", 401, "INVALID_TOKEN");
};

/**
 * Handle JWT expired token error.
 * @returns {AppError} Transformed error
 */
const handleJWTExpiredError = () => {
  return new AppError("Token expired. Please authenticate again.", 401, "TOKEN_EXPIRED");
};

/**
 * Handle Multer file upload errors.
 * @param {Error} err - Multer error
 * @returns {AppError} Transformed error
 */
const handleMulterError = (err) => {
  const messages = {
    LIMIT_FILE_SIZE: "File too large",
    LIMIT_FILE_COUNT: "Too many files",
    LIMIT_UNEXPECTED_FILE: "Unexpected file field",
    LIMIT_PART_COUNT: "Too many parts",
    LIMIT_FIELD_KEY: "Field name too long",
    LIMIT_FIELD_VALUE: "Field value too long",
    LIMIT_FIELD_COUNT: "Too many fields",
  };
  const message = messages[err.code] || "File upload error";
  return new AppError(message, 400, "FILE_UPLOAD_ERROR", true, { code: err.code });
};

/* ============================================================
 * ERROR RESPONSE FORMATTERS
 * ============================================================ */

/**
 * Send detailed error response (development mode).
 * @param {AppError} err - Error object
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const sendErrorDev = (err, req, res) => {
  res.status(err.statusCode).json({
    success: false,
    error: {
      status: err.status,
      code: err.code,
      message: err.message,
      details: err.details,
      stack: err.stack,
      timestamp: err.timestamp,
      requestId: req.requestId,
    },
  });
};

/**
 * Send minimal error response (production mode).
 * Only shows details for operational errors.
 * @param {AppError} err - Error object
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const sendErrorProd = (err, req, res) => {
  // Operational error: send details to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        status: err.status,
        code: err.code,
        message: err.message,
        ...(err.details && { details: err.details }),
        timestamp: err.timestamp,
        requestId: req.requestId,
      },
    });
  } else {
    // Programming error: send generic message
    logger.error("Programming error", {
      error: err.message,
      stack: err.stack,
      requestId: req.requestId,
    });

    res.status(500).json({
      success: false,
      error: {
        status: "error",
        code: "INTERNAL_ERROR",
        message: "Something went wrong. Please try again later.",
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      },
    });
  }
};

/* ============================================================
 * MAIN ERROR HANDLER
 * ============================================================ */

/**
 * Global error handling middleware.
 * Must be the last middleware in the chain.
 *
 * @param {Error} err - Error object
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 *
 * @example
 * // Apply after all routes
 * app.use(errorHandler);
 */
const errorHandler = (err, req, res, next) => {
  // Set defaults
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";
  err.code = err.code || "INTERNAL_ERROR";
  err.timestamp = err.timestamp || new Date().toISOString();

  // Log error
  const logData = {
    statusCode: err.statusCode,
    code: err.code,
    message: err.message,
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
    requestId: req.requestId,
    userAgent: req.get("user-agent"),
  };

  if (err.statusCode >= 500) {
    logger.error("Server error", { ...logData, stack: err.stack });
  } else if (err.statusCode >= 400) {
    logger.warn("Client error", logData);
  }

  // Transform known error types
  let error = { ...err, message: err.message };

  // Mongoose errors
  if (err.name === "CastError") error = handleCastErrorDB(err);
  if (err.code === 11000) error = handleDuplicateFieldsDB(err);
  if (err.name === "ValidationError") error = handleValidationErrorDB(err);

  // JWT errors
  if (err.name === "JsonWebTokenError") error = handleJWTError();
  if (err.name === "TokenExpiredError") error = handleJWTExpiredError();

  // Multer errors
  if (err.name === "MulterError") error = handleMulterError(err);

  // Ensure error has AppError properties
  if (!(error instanceof AppError)) {
    error = new AppError(
      error.message || "Internal server error",
      error.statusCode || 500,
      error.code || "INTERNAL_ERROR",
      error.isOperational !== undefined ? error.isOperational : false
    );
  }

  // Send response based on environment
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction) {
    sendErrorProd(error, req, res);
  } else {
    sendErrorDev(error, req, res);
  }
};

/* ============================================================
 * 404 NOT FOUND HANDLER
 * ============================================================ */

/**
 * Handle 404 Not Found for undefined routes.
 * Should be placed after all route definitions.
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 *
 * @example
 * // Apply after all routes, before errorHandler
 * app.use(notFoundHandler);
 */
const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError("Endpoint", `${req.method} ${req.originalUrl}`);
  next(error);
};

/* ============================================================
 * ASYNC HANDLER WRAPPER
 * ============================================================ */

/**
 * Wrap async route handlers to catch errors automatically.
 * Eliminates need for try-catch in every async handler.
 *
 * @param {Function} fn - Async route handler function
 * @returns {Function} Wrapped handler that catches errors
 *
 * @example
 * import { asyncHandler } from './middleware/errorHandler.js';
 *
 * router.get('/floors', asyncHandler(async (req, res) => {
 *   const floors = await FloorMap.find();
 *   res.json({ success: true, data: floors });
 * }));
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/* ============================================================
 * EXPORTS
 * ============================================================ */

export { errorHandler, notFoundHandler, asyncHandler };

export default errorHandler;
