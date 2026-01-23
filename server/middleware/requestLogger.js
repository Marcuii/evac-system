/**
 * @fileoverview Request Logger & Tracking Middleware
 * @description Middleware for request ID generation, request logging,
 *              and response time tracking.
 *
 * @requires uuid - UUID generation for request IDs
 * @requires ../utils/logger - Winston logger
 *
 * @module middleware/requestLogger
 * @author Marcelino Saad
 * @version 1.0.0
 *
 * @description
 * Request Lifecycle:
 * ┌─────────────────────────────────────────────────────────────┐
 * │                    Request Tracking                          │
 * ├─────────────────────────────────────────────────────────────┤
 * │  1. Generate unique request ID (UUID v4)                    │
 * │  2. Attach to req.requestId and response header             │
 * │  3. Record request start time                               │
 * │  4. Log request details on response finish                  │
 * └─────────────────────────────────────────────────────────────┘
 *
 * @example
 * import { requestLogger, requestIdMiddleware } from './middleware/requestLogger.js';
 *
 * app.use(requestIdMiddleware);  // Generate request IDs
 * app.use(requestLogger);        // Log requests
 */

import { v4 as uuidv4 } from "uuid";
import logger from "../utils/logger.js";

/* ============================================================
 * REQUEST ID MIDDLEWARE
 * ============================================================ */

/**
 * Generate unique request ID for request tracing.
 * Uses existing X-Request-Id header if provided, otherwise generates UUID.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 *
 * @example
 * app.use(requestIdMiddleware);
 *
 * // Access in route handlers:
 * console.log(req.requestId); // "550e8400-e29b-41d4-a716-446655440000"
 */
const requestIdMiddleware = (req, res, next) => {
  // Use existing request ID or generate new one
  const requestId = req.get("X-Request-Id") || uuidv4();

  // Attach to request for use in handlers
  req.requestId = requestId;

  // Set response header for client tracking
  res.set("X-Request-Id", requestId);

  next();
};

/* ============================================================
 * REQUEST TIMING MIDDLEWARE
 * ============================================================ */

/**
 * Track request timing and attach start time to request.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const requestTimingMiddleware = (req, res, next) => {
  // Record high-resolution start time
  req.startTime = process.hrtime.bigint();
  req.startTimeMs = Date.now();

  next();
};

/* ============================================================
 * REQUEST LOGGER MIDDLEWARE
 * ============================================================ */

/**
 * Paths to skip logging (health checks, static files, etc.).
 * @const {string[]}
 */
const SKIP_PATHS = [
  "/health",
  "/favicon.ico",
  "/robots.txt",
];

/**
 * Check if path should skip logging.
 * @param {string} path - Request path
 * @returns {boolean} Whether to skip logging
 */
const shouldSkipLogging = (path) => {
  return SKIP_PATHS.some((skip) => path.startsWith(skip));
};

/**
 * Log incoming requests and outgoing responses.
 * Logs timing, status code, and request details.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 *
 * @example
 * app.use(requestLogger);
 *
 * // Output: 2026-01-22 10:30:00.000 [HTTP ] GET /api/floors → 200 (45ms)
 */
const requestLogger = (req, res, next) => {
  // Skip logging for certain paths
  if (shouldSkipLogging(req.path)) {
    return next();
  }

  // Record start time
  const startTime = process.hrtime.bigint();
  const startTimeMs = Date.now();
  req.startTime = startTime;
  req.startTimeMs = startTimeMs;

  // Log on response finish
  res.on("finish", () => {
    // Calculate duration
    const endTime = process.hrtime.bigint();
    const durationNs = endTime - startTime;
    const durationMs = Number(durationNs / BigInt(1000000));

    // Use the logger's logRequest method
    logger.logRequest(req, res, durationMs);
  });

  next();
};

/* ============================================================
 * COMBINED MIDDLEWARE
 * ============================================================ */

/**
 * Combined middleware that applies request ID, timing, and logging.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 *
 * @example
 * app.use(requestTracking);
 */
const requestTracking = (req, res, next) => {
  // Generate request ID
  const requestId = req.get("X-Request-Id") || uuidv4();
  req.requestId = requestId;
  res.set("X-Request-Id", requestId);

  // Skip logging for certain paths
  if (shouldSkipLogging(req.path)) {
    return next();
  }

  // Record start time
  const startTime = process.hrtime.bigint();
  req.startTime = startTime;
  req.startTimeMs = Date.now();

  // Log on response finish
  res.on("finish", () => {
    const endTime = process.hrtime.bigint();
    const durationNs = endTime - startTime;
    const durationMs = Number(durationNs / BigInt(1000000));
    logger.logRequest(req, res, durationMs);
  });

  next();
};

/* ============================================================
 * EXPORTS
 * Only export what's actually used
 * ============================================================ */

export { requestTracking };

export default requestTracking;
