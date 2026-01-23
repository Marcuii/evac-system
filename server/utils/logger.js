/**
 * @fileoverview Winston Logger Configuration
 * @description Production-ready logging system with file rotation,
 *              multiple transports, and structured JSON logging.
 *
 * @requires winston - Logging library
 * @requires path - Path utilities
 * @requires fs - File system operations
 *
 * @module utils/logger
 * @author Marcelino Saad
 * @version 1.0.0
 *
 * @description
 * Logger Features:
 * ┌─────────────────────────────────────────────────────────────┐
 * │                    Winston Logger                           │
 * ├─────────────────────────────────────────────────────────────┤
 * │  Transports:                                                │
 * │  - Console: Colorized output for development                │
 * │  - combined.log: All logs (info and above)                  │
 * │  - error.log: Error logs only                               │
 * │  - exceptions.log: Uncaught exceptions                      │
 * │  - rejections.log: Unhandled promise rejections             │
 * ├─────────────────────────────────────────────────────────────┤
 * │  Log Levels: error → warn → info → http → debug             │
 * └─────────────────────────────────────────────────────────────┘
 *
 * @example
 * import logger from './utils/logger.js';
 *
 * logger.info('Server started', { port: 3000 });
 * logger.error('Database error', { error: err.message });
 * logger.warn('High memory usage', { usage: '85%' });
 * logger.http('GET /api/floors', { status: 200, duration: '45ms' });
 * logger.debug('Processing floor', { floorId: 'floor_1' });
 */

import winston from "winston";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

/* ============================================================
 * DIRECTORY SETUP
 * ============================================================ */

/** @const {string} __filename - Current file path */
const __filename = fileURLToPath(import.meta.url);

/** @const {string} __dirname - Current directory path */
const __dirname = path.dirname(__filename);

/** @const {string} logsDir - Directory for log files */
const logsDir = path.join(__dirname, "..", "logs");

// Create logs directory if it doesn't exist
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/* ============================================================
 * LOG LEVELS CONFIGURATION
 * ============================================================ */

/**
 * Custom log levels with associated colors.
 * Lower number = higher priority.
 * @const {Object}
 */
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

/**
 * Colors for each log level.
 * @const {Object}
 */
const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "cyan",
};

// Add colors to winston
winston.addColors(colors);

/* ============================================================
 * ENVIRONMENT-BASED LOG LEVEL
 * ============================================================ */

/**
 * Determine log level based on NODE_ENV.
 * Development: all logs (debug)
 * Production: info and above only
 * @returns {string} The appropriate log level
 */
const getLogLevel = () => {
  const env = process.env.NODE_ENV || "development";
  return env === "production" ? "info" : "debug";
};

/* ============================================================
 * LOG FORMATTERS
 * ============================================================ */

/**
 * Timestamp format for log entries.
 * @const {winston.Logform.Format}
 */
const timestampFormat = winston.format.timestamp({
  format: "YYYY-MM-DD HH:mm:ss.SSS",
});

/**
 * Custom printf format for console output.
 * @const {winston.Logform.Format}
 */
const consoleFormat = winston.format.printf(({ level, message, timestamp, ...metadata }) => {
  // Format metadata if present
  const meta = Object.keys(metadata).length
    ? `\n  └─ ${JSON.stringify(metadata, null, 2).replace(/\n/g, "\n     ")}`
    : "";

  return `${timestamp} [${level.toUpperCase().padEnd(5)}] ${message}${meta}`;
});

/**
 * JSON format for file output (better for log aggregation).
 * @const {winston.Logform.Format}
 */
const fileFormat = winston.format.combine(
  timestampFormat,
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * Colorized format for console output.
 * @const {winston.Logform.Format}
 */
const colorizedConsoleFormat = winston.format.combine(
  timestampFormat,
  winston.format.colorize({ all: true }),
  consoleFormat
);

/* ============================================================
 * TRANSPORT CONFIGURATION
 * ============================================================ */

/**
 * Console transport for development/production output.
 * @const {winston.transports.Console}
 */
const consoleTransport = new winston.transports.Console({
  format: colorizedConsoleFormat,
});

/**
 * Combined log file - all logs info level and above.
 * @const {winston.transports.File}
 */
const combinedFileTransport = new winston.transports.File({
  filename: path.join(logsDir, "combined.log"),
  format: fileFormat,
  maxsize: 10 * 1024 * 1024, // 10MB
  maxFiles: 5,
  tailable: true,
});

/**
 * Error log file - errors only.
 * @const {winston.transports.File}
 */
const errorFileTransport = new winston.transports.File({
  filename: path.join(logsDir, "error.log"),
  level: "error",
  format: fileFormat,
  maxsize: 10 * 1024 * 1024, // 10MB
  maxFiles: 5,
  tailable: true,
});

/* ============================================================
 * LOGGER INSTANCE
 * ============================================================ */

/**
 * Winston logger instance with multiple transports.
 * @const {winston.Logger}
 */
const logger = winston.createLogger({
  level: getLogLevel(),
  levels,
  transports: [
    consoleTransport,
    combinedFileTransport,
    errorFileTransport,
  ],
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, "exceptions.log"),
      format: fileFormat,
      maxsize: 10 * 1024 * 1024,
      maxFiles: 3,
    }),
  ],
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, "rejections.log"),
      format: fileFormat,
      maxsize: 10 * 1024 * 1024,
      maxFiles: 3,
    }),
  ],
  // Don't exit on handled exceptions
  exitOnError: false,
});

/* ============================================================
 * HELPER METHODS
 * ============================================================ */

/**
 * Log an HTTP request with timing information.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {number} duration - Request duration in ms
 */
logger.logRequest = (req, res, duration) => {
  const meta = {
    method: req.method,
    url: req.originalUrl,
    status: res.statusCode,
    duration: `${duration}ms`,
    ip: req.ip || req.connection?.remoteAddress,
    userAgent: req.get("user-agent")?.substring(0, 100),
    requestId: req.requestId,
  };

  // Log level based on status code
  if (res.statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl}`, meta);
  } else if (res.statusCode >= 400) {
    logger.warn(`${req.method} ${req.originalUrl}`, meta);
  } else {
    logger.http(`${req.method} ${req.originalUrl}`, meta);
  }
};

/**
 * Log database operation.
 * @param {string} operation - Operation type (query, insert, update, delete)
 * @param {string} collection - Collection name
 * @param {number} duration - Operation duration in ms
 * @param {Object} [extra] - Additional metadata
 */
logger.logDB = (operation, collection, duration, extra = {}) => {
  logger.debug(`DB ${operation.toUpperCase()} ${collection}`, {
    operation,
    collection,
    duration: `${duration}ms`,
    ...extra,
  });
};

/**
 * Log service startup.
 * @param {string} serviceName - Name of the service
 * @param {Object} [config] - Service configuration
 */
logger.logStartup = (serviceName, config = {}) => {
  logger.info(`✅ ${serviceName} initialized`, config);
};

/**
 * Log service shutdown.
 * @param {string} serviceName - Name of the service
 * @param {string} [reason] - Reason for shutdown
 */
logger.logShutdown = (serviceName, reason = "graceful") => {
  logger.info(`🛑 ${serviceName} shutting down`, { reason });
};

/* ============================================================
 * EXPORT
 * ============================================================ */

export default logger;
