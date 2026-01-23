/**
 * @fileoverview Express Server Entry Point - Production Ready
 * @description Main entry point for the EES Evacuation Backend Server.
 *              Configures Express, Socket.IO, security middleware, and initializes all services.
 *
 * @requires http - Node.js HTTP module for server creation
 * @requires express - Web framework for REST API
 * @requires path - Path utilities for static file serving
 * @requires socket.io - WebSocket library for real-time communication
 * @requires compression - Gzip compression middleware
 * @requires dotenv - Environment variable loading
 *
 * @module server
 * @author Marcelino Saad
 * @version 1.0.0
 *
 * @description
 * Server Architecture:
 * ┌─────────────────────────────────────────────────────────────┐
 * │                    Express Server (:3000)                    │
 * ├─────────────────────────────────────────────────────────────┤
 * │  Security Layer                                             │
 * │  - Helmet (HTTP headers)                                    │
 * │  - Rate Limiting (DDoS protection)                          │
 * │  - HPP (Parameter pollution prevention)                     │
 * │  - Mongo Sanitize (NoSQL injection prevention)              │
 * │  - CORS (Cross-origin control)                              │
 * ├──────────────────────┬──────────────────────────────────────┤
 * │  REST API            │  WebSocket                           │
 * │  /api/floors/*       │  Socket.IO for real-time routes      │
 * │  /api/routes/*       │                                      │
 * │  /api/records/*      │                                      │
 * ├──────────────────────┴──────────────────────────────────────┤
 * │  Static Files                                               │
 * │  /images/*   → Local storage directory                      │
 * │  /floors/*   → Floor map images                             │
 * ├─────────────────────────────────────────────────────────────┤
 * │  Monitoring & Logging                                       │
 * │  - Winston logger with file rotation                        │
 * │  - Request ID tracking                                      │
 * │  - Health check endpoints                                   │
 * ├─────────────────────────────────────────────────────────────┤
 * │  Background Services                                        │
 * │  - Periodic scheduler (capture → AI → routing pipeline)     │
 * │  - Cloud sync (periodic MongoDB backup to cloud)            │
 * └─────────────────────────────────────────────────────────────┘
 *
 * Environment Variables:
 * - NODE_ENV: Environment (development/production)
 * - PORT: Server port (default: 3000)
 * - LOCAL_STORAGE_DIR: Path to local image storage
 * - FLOOR_MAPS_DIR: Path to floor map images
 * - LOCAL_MONGO_URI: MongoDB connection string
 * - CLOUDINARY_*: Cloud image storage credentials
 * - CLOUD_MONGO_URI: Cloud MongoDB connection string for sync
 * - RATE_LIMIT_MAX: Max requests per 15 min (default: 100)
 * - CORS_ORIGINS: Comma-separated allowed origins (default: *)
 * 
 * Note: Cloud sync and processing settings are managed via Admin Dashboard
 * and stored in MongoDB (see Settings API).
 */

import http from "http";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { Server } from "socket.io";
import compression from "compression";
import dotenv from "dotenv";
import mongoose from "mongoose";

/* ============================================================
 * ENVIRONMENT CONFIGURATION
 * Load .env variables before any other imports that use them
 * ============================================================ */
dotenv.config();

/** @const {string} __filename - Current file path (ES module equivalent) */
const __filename = fileURLToPath(import.meta.url);

/** @const {string} __dirname - Current directory path (ES module equivalent) */
const __dirname = path.dirname(__filename);

/* ============================================================
 * MODULE IMPORTS
 * Import after dotenv to ensure env vars are available
 * ============================================================ */

// Core services
import connectDB from "./config/db.local.js";
import floorRoutes from "./routes/floorRoutes.js";
import routeRoutes from "./routes/routeRoutes.js";
import recordRoutes from "./routes/recordRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import { initSocket } from "./sockets/routeSocket.js";
import { initScheduler, stopScheduler } from "./utils/periodicJob.js";
import { initCloudSync, disconnectFromCloud } from "./utils/cloudSync.js";

// Production middleware
import logger from "./utils/logger.js";
import { applySecurityMiddleware } from "./middleware/security.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import requestTracking from "./middleware/requestLogger.js";

/* ============================================================
 * STATIC FILE CONFIGURATION
 * Paths for serving images and floor maps
 * ============================================================ */

/** @const {string} LOCAL_STORAGE_DIR - Directory for captured camera frames */
const LOCAL_STORAGE_DIR = process.env.LOCAL_STORAGE_DIR || "./local_storage";

/** @const {string} FLOOR_MAPS_DIR - Directory for uploaded floor map images */
const FLOOR_MAPS_DIR = process.env.FLOOR_MAPS_DIR || "./temp_frames/floor_maps";

/* ============================================================
 * EXPRESS APPLICATION SETUP
 * ============================================================ */

/** @const {express.Application} app - Express application instance */
const app = express();

/** @type {boolean} Track if server is shutting down */
let isShuttingDown = false;

// ─────────────────────────────────────────────
// DATABASE CONNECTION
// Must connect before handling any requests
// ─────────────────────────────────────────────
await connectDB();

// ─────────────────────────────────────────────
// TRUST PROXY (for rate limiting behind reverse proxy)
// ─────────────────────────────────────────────
app.set("trust proxy", 1);

// ─────────────────────────────────────────────
// SECURITY MIDDLEWARE (first!)
// Helmet, Rate Limiting, HPP, Mongo Sanitize, CORS
// ─────────────────────────────────────────────
applySecurityMiddleware(app);

// ─────────────────────────────────────────────
// REQUEST TRACKING & LOGGING
// Request ID generation and logging
// ─────────────────────────────────────────────
app.use(requestTracking);

// ─────────────────────────────────────────────
// COMPRESSION
// Gzip compression for responses
// ─────────────────────────────────────────────
app.use(compression({
  filter: (req, res) => {
    if (req.headers["x-no-compression"]) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6, // Balance between speed and compression
}));

// ─────────────────────────────────────────────
// BODY PARSERS
// Parse JSON and URL-encoded request bodies
// ─────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ─────────────────────────────────────────────
// STATIC FILE SERVING
// Resolve relative paths from __dirname for portability
// ─────────────────────────────────────────────

/** @const {string} localStoragePath - Resolved absolute path to local storage */
const localStoragePath = path.isAbsolute(LOCAL_STORAGE_DIR)
  ? LOCAL_STORAGE_DIR
  : path.join(__dirname, LOCAL_STORAGE_DIR);

/** @const {string} floorMapsPath - Resolved absolute path to floor maps */
const floorMapsPath = path.isAbsolute(FLOOR_MAPS_DIR)
  ? FLOOR_MAPS_DIR
  : path.join(__dirname, FLOOR_MAPS_DIR);

app.use("/images", express.static(localStoragePath, { maxAge: "1h" }));
app.use("/floors", express.static(floorMapsPath, { maxAge: "1h" }));

// ─────────────────────────────────────────────
// HEALTH CHECK ENDPOINTS
// Detailed health checks for monitoring
// ─────────────────────────────────────────────

/**
 * Basic health check - for load balancers.
 * @route GET /
 */
app.get("/", (req, res) => {
  if (isShuttingDown) {
    return res.status(503).json({ ok: false, service: "evac-backend", status: "shutting_down" });
  }
  res.json({ ok: true, service: "evac-backend", version: "1.0.0" });
});

/**
 * Detailed health check - for monitoring systems.
 * @route GET /health
 */
app.get("/health", async (req, res) => {
  const healthData = {
    success: true,
    timestamp: new Date().toISOString(),
    service: "evac-backend",
    version: "1.0.0",
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      unit: "MB",
    },
    database: {
      status: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
      name: mongoose.connection.name || "unknown",
    },
  };

  // Return 503 if database is disconnected
  const statusCode = mongoose.connection.readyState === 1 ? 200 : 503;
  res.status(statusCode).json(healthData);
});

/**
 * Readiness check - is the server ready to accept requests?
 * @route GET /ready
 */
app.get("/ready", (req, res) => {
  if (isShuttingDown) {
    return res.status(503).json({ ready: false, reason: "shutting_down" });
  }
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ ready: false, reason: "database_disconnected" });
  }
  res.json({ ready: true });
});

// ─────────────────────────────────────────────
// API ROUTES
// RESTful endpoints for floor, route, and record management
// ─────────────────────────────────────────────
app.use("/api/floors", floorRoutes);       // Floor CRUD + status (admin auth required)
app.use("/api/routes", routeRoutes);       // Route retrieval (public)
app.use("/api/records", recordRoutes);     // Image record retrieval (admin auth required)
app.use("/api/settings", settingsRoutes);  // System settings (admin auth required)

// ─────────────────────────────────────────────
// ERROR HANDLING
// Must be after all routes
// ─────────────────────────────────────────────
app.use(notFoundHandler);   // Handle 404 for undefined routes
app.use(errorHandler);      // Global error handler

/* ============================================================
 * HTTP & WEBSOCKET SERVER SETUP
 * ============================================================ */

/** @const {http.Server} server - HTTP server wrapping Express app */
const server = http.createServer(app);

/** @const {Server} io - Socket.IO server for real-time communication */
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(",") : "*",
    methods: ["GET", "POST"],
  },
  // Production settings
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ─────────────────────────────────────────────
// SERVICE INITIALIZATION
// ─────────────────────────────────────────────
await initCloudSync();  // Start periodic cloud MongoDB sync (if enabled)
initSocket(io);         // Initialize WebSocket event handlers
initScheduler();        // Start periodic capture → AI → routing pipeline

logger.logStartup("Express Server", {
  port: process.env.PORT || 3000,
  environment: process.env.NODE_ENV || "development",
  nodeVersion: process.version,
});

/* ============================================================
 * GRACEFUL SHUTDOWN
 * ============================================================ */

/**
 * Gracefully shutdown the server.
 * Closes all connections and cleans up resources.
 *
 * @param {string} signal - Signal that triggered shutdown
 */
const gracefulShutdown = async (signal) => {
  if (isShuttingDown) {
    logger.warn("Shutdown already in progress...");
    return;
  }

  isShuttingDown = true;
  logger.logShutdown("Express Server", signal);

  // Set a timeout for forceful shutdown
  const forceShutdownTimeout = setTimeout(() => {
    logger.error("Forced shutdown due to timeout");
    process.exit(1);
  }, 30000); // 30 seconds

  try {
    // 1. Stop accepting new connections
    server.close((err) => {
      if (err) {
        logger.error("Error closing HTTP server", { error: err.message });
      } else {
        logger.info("HTTP server closed");
      }
    });

    // 2. Stop scheduled tasks
    stopScheduler();
    logger.info("Scheduler stopped");

    // 3. Close Socket.IO connections
    io.close((err) => {
      if (err) {
        logger.error("Error closing Socket.IO", { error: err.message });
      } else {
        logger.info("Socket.IO closed");
      }
    });

    // 4. Disconnect from cloud MongoDB (if connected)
    await disconnectFromCloud();
    logger.info("Cloud MongoDB disconnected");

    // 5. Close local MongoDB connection
    await mongoose.connection.close();
    logger.info("Local MongoDB disconnected");

    // Clear the force shutdown timeout
    clearTimeout(forceShutdownTimeout);

    logger.info("Graceful shutdown complete");
    process.exit(0);
  } catch (error) {
    logger.error("Error during shutdown", { error: error.message });
    clearTimeout(forceShutdownTimeout);
    process.exit(1);
  }
};

// Listen for termination signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught exceptions (should be rare with proper error handling)
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception", {
    error: error.message,
    stack: error.stack,
  });
  gracefulShutdown("uncaughtException");
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection", {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined,
  });
  // Don't shutdown for unhandled rejections, just log
});

/* ============================================================
 * SERVER STARTUP
 * ============================================================ */

/** @const {number} PORT - Server listening port */
const PORT = process.env.PORT || 3000;

/**
 * Start the HTTP server on all network interfaces.
 * Binding to 0.0.0.0 allows connections from other machines on the network.
 */
server.listen(PORT, "0.0.0.0", () => {
  logger.info(`🚀 Server running on port ${PORT}`, {
    port: PORT,
    environment: process.env.NODE_ENV || "development",
    pid: process.pid,
  });
});

/**
 * Export the Express app for testing purposes.
 * @exports app - Express application instance
 */
export default app;