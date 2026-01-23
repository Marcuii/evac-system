/**
 * @fileoverview Custom Application Error Class
 * @description Standardized error handling with HTTP status codes,
 *              error codes, and operational error distinction.
 *
 * @module utils/AppError
 * @author Marcelino Saad
 * @version 1.0.0
 *
 * @description
 * Error Types:
 * ┌─────────────────────────────────────────────────────────────┐
 * │  Operational Errors (isOperational: true)                   │
 * │  - Expected errors (validation, not found, unauthorized)    │
 * │  - Safe to send details to client                           │
 * ├─────────────────────────────────────────────────────────────┤
 * │  Programming Errors (isOperational: false)                  │
 * │  - Bugs, unexpected errors                                  │
 * │  - Generic message sent to client                           │
 * └─────────────────────────────────────────────────────────────┘
 *
 * @example
 * import { AppError, NotFoundError, ValidationError } from './utils/AppError.js';
 *
 * // Generic operational error
 * throw new AppError('Custom error message', 400, 'CUSTOM_ERROR');
 *
 * // Pre-defined error types
 * throw new NotFoundError('Floor', 'floor_123');
 * throw new ValidationError('Name is required');
 * throw new UnauthorizedError('Invalid token');
 */

/* ============================================================
 * BASE ERROR CLASS
 * ============================================================ */

/**
 * Custom application error class extending built-in Error.
 * Provides standardized error structure for API responses.
 *
 * @class AppError
 * @extends Error
 */
class AppError extends Error {
  /**
   * Create an AppError instance.
   *
   * @param {string} message - Human-readable error message
   * @param {number} [statusCode=500] - HTTP status code
   * @param {string} [code='INTERNAL_ERROR'] - Machine-readable error code
   * @param {boolean} [isOperational=true] - Whether error is operational (expected)
   * @param {Object} [details=null] - Additional error details
   */
  constructor(
    message,
    statusCode = 500,
    code = "INTERNAL_ERROR",
    isOperational = true,
    details = null
  ) {
    super(message);

    /** @type {number} HTTP status code */
    this.statusCode = statusCode;

    /** @type {string} Error status (fail for 4xx, error for 5xx) */
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";

    /** @type {string} Machine-readable error code */
    this.code = code;

    /** @type {boolean} Whether error is operational (safe to expose) */
    this.isOperational = isOperational;

    /** @type {Object|null} Additional error details */
    this.details = details;

    /** @type {string} ISO timestamp when error occurred */
    this.timestamp = new Date().toISOString();

    // Capture stack trace, excluding constructor call
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to JSON-serializable object.
   * @returns {Object} Error object for API response
   */
  toJSON() {
    return {
      success: false,
      error: {
        status: this.status,
        code: this.code,
        message: this.message,
        ...(this.details && { details: this.details }),
        timestamp: this.timestamp,
      },
    };
  }
}

/* ============================================================
 * SPECIALIZED ERROR CLASSES
 * ============================================================ */

/**
 * 400 Bad Request - Invalid input or request format.
 * @class BadRequestError
 * @extends AppError
 */
class BadRequestError extends AppError {
  /**
   * @param {string} [message='Bad request'] - Error message
   * @param {Object} [details=null] - Validation details
   */
  constructor(message = "Bad request", details = null) {
    super(message, 400, "BAD_REQUEST", true, details);
  }
}

/**
 * 400 Validation Error - Input validation failed.
 * @class ValidationError
 * @extends AppError
 */
class ValidationError extends AppError {
  /**
   * @param {string} [message='Validation failed'] - Error message
   * @param {Array|Object} [errors=null] - Validation errors
   */
  constructor(message = "Validation failed", errors = null) {
    super(message, 400, "VALIDATION_ERROR", true, { errors });
  }
}

/**
 * 401 Unauthorized - Authentication required or failed.
 * @class UnauthorizedError
 * @extends AppError
 */
class UnauthorizedError extends AppError {
  /**
   * @param {string} [message='Authentication required'] - Error message
   */
  constructor(message = "Authentication required") {
    super(message, 401, "UNAUTHORIZED", true);
  }
}

/**
 * 403 Forbidden - Access denied (authenticated but not authorized).
 * @class ForbiddenError
 * @extends AppError
 */
class ForbiddenError extends AppError {
  /**
   * @param {string} [message='Access denied'] - Error message
   */
  constructor(message = "Access denied") {
    super(message, 403, "FORBIDDEN", true);
  }
}

/**
 * 404 Not Found - Resource doesn't exist.
 * @class NotFoundError
 * @extends AppError
 */
class NotFoundError extends AppError {
  /**
   * @param {string} [resource='Resource'] - Type of resource not found
   * @param {string} [identifier=null] - Resource identifier
   */
  constructor(resource = "Resource", identifier = null) {
    const message = identifier
      ? `${resource} '${identifier}' not found`
      : `${resource} not found`;
    super(message, 404, "NOT_FOUND", true, { resource, identifier });
  }
}

/**
 * 409 Conflict - Resource already exists or state conflict.
 * @class ConflictError
 * @extends AppError
 */
class ConflictError extends AppError {
  /**
   * @param {string} [message='Resource already exists'] - Error message
   * @param {Object} [details=null] - Conflict details
   */
  constructor(message = "Resource already exists", details = null) {
    super(message, 409, "CONFLICT", true, details);
  }
}

/**
 * 422 Unprocessable Entity - Request understood but cannot be processed.
 * @class UnprocessableError
 * @extends AppError
 */
class UnprocessableError extends AppError {
  /**
   * @param {string} [message='Unable to process request'] - Error message
   * @param {Object} [details=null] - Processing error details
   */
  constructor(message = "Unable to process request", details = null) {
    super(message, 422, "UNPROCESSABLE_ENTITY", true, details);
  }
}

/**
 * 429 Too Many Requests - Rate limit exceeded.
 * @class RateLimitError
 * @extends AppError
 */
class RateLimitError extends AppError {
  /**
   * @param {string} [message='Too many requests, please try again later'] - Error message
   * @param {number} [retryAfter=60] - Seconds until rate limit resets
   */
  constructor(message = "Too many requests, please try again later", retryAfter = 60) {
    super(message, 429, "RATE_LIMIT_EXCEEDED", true, { retryAfter });
  }
}

/**
 * 500 Internal Server Error - Unexpected server error.
 * @class InternalError
 * @extends AppError
 */
class InternalError extends AppError {
  /**
   * @param {string} [message='Internal server error'] - Error message
   * @param {boolean} [isOperational=false] - Whether error is operational
   */
  constructor(message = "Internal server error", isOperational = false) {
    super(message, 500, "INTERNAL_ERROR", isOperational);
  }
}

/**
 * 502 Bad Gateway - External service error.
 * @class BadGatewayError
 * @extends AppError
 */
class BadGatewayError extends AppError {
  /**
   * @param {string} [service='External service'] - Name of failing service
   * @param {string} [message=null] - Custom error message
   */
  constructor(service = "External service", message = null) {
    const msg = message || `${service} unavailable`;
    super(msg, 502, "BAD_GATEWAY", true, { service });
  }
}

/**
 * 503 Service Unavailable - Service temporarily unavailable.
 * @class ServiceUnavailableError
 * @extends AppError
 */
class ServiceUnavailableError extends AppError {
  /**
   * @param {string} [message='Service temporarily unavailable'] - Error message
   * @param {number} [retryAfter=60] - Seconds until service available
   */
  constructor(message = "Service temporarily unavailable", retryAfter = 60) {
    super(message, 503, "SERVICE_UNAVAILABLE", true, { retryAfter });
  }
}

/**
 * Database Operation Error - MongoDB/Mongoose errors.
 * @class DatabaseError
 * @extends AppError
 */
class DatabaseError extends AppError {
  /**
   * @param {string} [message='Database operation failed'] - Error message
   * @param {Object} [details=null] - Database error details
   */
  constructor(message = "Database operation failed", details = null) {
    super(message, 500, "DATABASE_ERROR", true, details);
  }
}

/* ============================================================
 * EXPORTS
 * Only export classes that are actually used in the codebase
 * ============================================================ */

export {
  AppError,
  ValidationError,
  NotFoundError,
  DatabaseError,
};

export default AppError;
