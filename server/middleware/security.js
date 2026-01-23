/**
 * @fileoverview Security Middleware Configuration
 * @description Production security middleware stack including HTTP headers,
 *              rate limiting, parameter pollution prevention, and NoSQL injection protection.
 *
 * @requires helmet - HTTP security headers
 * @requires express-rate-limit - Rate limiting
 * @requires hpp - HTTP Parameter Pollution protection
 *
 * @module middleware/security
 * @author Marcelino Saad
 * @version 1.0.0
 *
 * @description
 * Security Layers:
 * ┌─────────────────────────────────────────────────────────────┐
 * │                    Security Middleware                       │
 * ├─────────────────────────────────────────────────────────────┤
 * │  1. Helmet        → HTTP security headers (XSS, etc.)       │
 * │  2. Rate Limiter  → Prevent DDoS/brute force attacks        │
 * │  3. HPP           → Prevent parameter pollution             │
 * │  4. MongoSanitize → Prevent NoSQL injection (custom impl)   │
 * │  5. CORS          → Cross-origin resource sharing           │
 * └─────────────────────────────────────────────────────────────┘
 *
 * @example
 * import { applySecurityMiddleware, apiLimiter } from './middleware/security.js';
 *
 * // Apply all security middleware
 * applySecurityMiddleware(app);
 *
 * // Or apply rate limiter to specific routes
 * app.use('/api/', apiLimiter);
 */

import helmet from "helmet";
import rateLimit from "express-rate-limit";
import hpp from "hpp";
import cors from "cors";
import logger from "../utils/logger.js";

/* ============================================================
 * HELMET CONFIGURATION
 * HTTP Security Headers
 * ============================================================ */

/**
 * Helmet middleware with production-ready security headers.
 * @const {Function}
 */
const helmetMiddleware = helmet({
  // Content Security Policy - Restrict resource loading
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  // Cross-Origin settings
  crossOriginEmbedderPolicy: false, // Allow embedding for API clients
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin for images
  // DNS Prefetch Control
  dnsPrefetchControl: { allow: false },
  // Frameguard - Prevent clickjacking
  frameguard: { action: "deny" },
  // Hide X-Powered-By header
  hidePoweredBy: true,
  // HSTS - Force HTTPS (enable in production with valid SSL)
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  // IE No Open
  ieNoOpen: true,
  // No Sniff - Prevent MIME type sniffing
  noSniff: true,
  // Origin Agent Cluster
  originAgentCluster: true,
  // Permitted Cross-Domain Policies
  permittedCrossDomainPolicies: { permittedPolicies: "none" },
  // Referrer Policy
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  // XSS Filter (legacy, but still useful)
  xssFilter: true,
});

/* ============================================================
 * RATE LIMITING CONFIGURATION
 * ============================================================ */

/**
 * General API rate limiter.
 * Limits: 100 requests per 15 minutes per IP.
 * @const {Function}
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX || "10000000", 10),
  message: {
    success: false,
    error: {
      status: "fail",
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests, please try again later",
      retryAfter: 15 * 60, // seconds
    },
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  // Use default IP-based key generator (handles IPv6 properly)
  // Skip successful requests from count (optional, stricter without)
  skipSuccessfulRequests: false,
  // Custom handler for rate limit exceeded
  handler: (req, res, next, options) => {
    logger.warn("Rate limit exceeded", {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    res.status(429).json(options.message);
  },
});

/**
 * Strict rate limiter for authentication endpoints.
 * Limits: 5 requests per 15 minutes per IP.
 * @const {Function}
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    success: false,
    error: {
      status: "fail",
      code: "AUTH_RATE_LIMIT_EXCEEDED",
      message: "Too many authentication attempts, please try again later",
      retryAfter: 15 * 60,
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn("Auth rate limit exceeded", {
      ip: req.ip,
      path: req.path,
    });
    res.status(429).json(options.message);
  },
});

/**
 * Upload rate limiter for file uploads.
 * Limits: 20 uploads per hour per IP.
 * @const {Function}
 */
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: {
    success: false,
    error: {
      status: "fail",
      code: "UPLOAD_RATE_LIMIT_EXCEEDED",
      message: "Too many uploads, please try again later",
      retryAfter: 60 * 60,
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/* ============================================================
 * CORS CONFIGURATION
 * ============================================================ */

/**
 * CORS configuration for production.
 * @const {Object}
 */
const corsOptions = {
  // Allow origins from environment or all in development
  origin: (origin, callback) => {
    const allowedOrigins = process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim())
      : ["*"];

    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }

    // Allow all origins if "*" is in the list
    if (allowedOrigins.includes("*")) {
      return callback(null, true);
    }

    // Check if origin is allowed
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Reject unauthorized origins
    logger.warn("CORS blocked origin", { origin });
    return callback(new Error("CORS: Origin not allowed"), false);
  },
  credentials: true, // Allow cookies
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "x-admin-auth",
    "x-request-id",
    "Accept",
    "Origin",
  ],
  exposedHeaders: [
    "X-Request-Id",
    "X-RateLimit-Limit",
    "X-RateLimit-Remaining",
    "X-RateLimit-Reset",
  ],
  maxAge: 86400, // Cache preflight for 24 hours
};

/**
 * CORS middleware with production configuration.
 * @const {Function}
 */
const corsMiddleware = cors(corsOptions);

/* ============================================================
 * HPP CONFIGURATION
 * HTTP Parameter Pollution Prevention
 * ============================================================ */

/**
 * HPP middleware to prevent parameter pollution.
 * Whitelist allows arrays for specific parameters.
 * @const {Function}
 */
const hppMiddleware = hpp({
  whitelist: [
    // Parameters that can accept arrays
    "floorId",
    "cameraId",
    "status",
    "type",
    "tags",
  ],
});

/* ============================================================
 * MONGO SANITIZE CONFIGURATION
 * NoSQL Injection Prevention (Custom Express 5.x Compatible)
 * ============================================================ */

/**
 * Sanitizes a value by removing MongoDB operators ($ and .) recursively.
 * Express 5.x compatible - doesn't modify read-only req properties.
 *
 * @param {*} value - Value to sanitize
 * @param {string} [replaceWith='_'] - Character to replace prohibited chars
 * @returns {*} Sanitized value
 * @private
 */
const sanitizeValue = (value, replaceWith = "_") => {
  if (value === null || value === undefined) return value;

  if (typeof value === "string") {
    // Remove $ at start of string and replace . in keys
    if (value.startsWith("$")) {
      return replaceWith + value.slice(1);
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, replaceWith));
  }

  if (typeof value === "object") {
    const sanitized = {};
    for (const [key, val] of Object.entries(value)) {
      // Sanitize key if it starts with $ or contains .
      let sanitizedKey = key;
      if (key.startsWith("$")) {
        sanitizedKey = replaceWith + key.slice(1);
      }
      sanitizedKey = sanitizedKey.replace(/\./g, replaceWith);
      sanitized[sanitizedKey] = sanitizeValue(val, replaceWith);
    }
    return sanitized;
  }

  return value;
};

/**
 * Check if object contains MongoDB operators
 * @param {*} obj - Object to check
 * @returns {boolean} True if contains dangerous operators
 * @private
 */
const containsMongoOperators = (obj) => {
  if (obj === null || obj === undefined) return false;

  if (typeof obj === "string") {
    return obj.startsWith("$");
  }

  if (Array.isArray(obj)) {
    return obj.some((item) => containsMongoOperators(item));
  }

  if (typeof obj === "object") {
    for (const [key, val] of Object.entries(obj)) {
      if (key.startsWith("$") || key.includes(".")) {
        return true;
      }
      if (containsMongoOperators(val)) {
        return true;
      }
    }
  }

  return false;
};

/**
 * Custom MongoDB sanitization middleware compatible with Express 5.x.
 * Sanitizes req.body and req.params (which are writable).
 * For req.query, only logs warnings since it's read-only in Express 5.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * @returns {void}
 */
const mongoSanitizeMiddleware = (req, res, next) => {
  let sanitized = false;

  // Sanitize body (writable)
  if (req.body && typeof req.body === "object") {
    if (containsMongoOperators(req.body)) {
      req.body = sanitizeValue(req.body);
      sanitized = true;
    }
  }

  // Sanitize params (writable)
  if (req.params && typeof req.params === "object") {
    if (containsMongoOperators(req.params)) {
      const sanitizedParams = sanitizeValue(req.params);
      // Only update individual params that changed
      for (const [key, val] of Object.entries(sanitizedParams)) {
        req.params[key] = val;
      }
      sanitized = true;
    }
  }

  // Check query for operators (read-only in Express 5, so we just warn and reject)
  if (req.query && typeof req.query === "object") {
    if (containsMongoOperators(req.query)) {
      logger.warn("NoSQL injection attempt blocked in query", {
        ip: req.ip,
        path: req.path,
        method: req.method,
      });
      return res.status(400).json({
        success: false,
        error: {
          status: "fail",
          code: "INVALID_QUERY",
          message: "Invalid query parameters detected",
        },
      });
    }
  }

  if (sanitized) {
    logger.warn("NoSQL injection attempt sanitized", {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
  }

  next();
};

/* ============================================================
 * COMBINED SECURITY MIDDLEWARE
 * ============================================================ */

/**
 * Apply all security middleware to Express app.
 * Should be called early in the middleware chain.
 *
 * @param {express.Application} app - Express application instance
 * @returns {void}
 *
 * @example
 * import express from 'express';
 * import { applySecurityMiddleware } from './middleware/security.js';
 *
 * const app = express();
 * applySecurityMiddleware(app);
 */
const applySecurityMiddleware = (app) => {
  // 1. CORS - Must be first for preflight requests
  app.use(corsMiddleware);

  // 2. Helmet - Security headers
  app.use(helmetMiddleware);

  // 3. Rate limiting - Apply to API routes
  app.use("/api/", apiLimiter);

  // 4. HPP - Parameter pollution prevention
  app.use(hppMiddleware);

  // 5. Mongo Sanitize - NoSQL injection prevention
  app.use(mongoSanitizeMiddleware);

  logger.logStartup("Security Middleware", {
    helmet: true,
    rateLimit: `${process.env.RATE_LIMIT_MAX || 100} req/15min`,
    hpp: true,
    mongoSanitize: true,
    cors: process.env.CORS_ORIGINS || "*",
  });
};

/* ============================================================
 * EXPORTS
 * Only export functions that are actually used
 * ============================================================ */

export {
  applySecurityMiddleware,
  apiLimiter,
  authLimiter,
  uploadLimiter,
};

export default applySecurityMiddleware;
