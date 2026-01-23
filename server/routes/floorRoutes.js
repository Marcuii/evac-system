/**
 * @fileoverview Floor Routes - API Endpoint Definitions
 * @description Defines all floor-related API endpoints including:
 *              - Floor CRUD operations
 *              - Status management (floor/camera/screen)
 *              - System-wide operations
 * 
 * @requires express - Express.js framework
 * @requires adminAuth - Admin authentication middleware
 * @requires multerUpload - File upload middleware for floor images
 * 
 * @module routes/floorRoutes
 * @author Marcelino Saad
 * @version 1.0.0
 * 
 * @example
 * // Mount in server.js:
 * // app.use('/api/floors', floorRoutes);
 */

import express from "express";
const router = express.Router();

/* ============================================================
 * MIDDLEWARE IMPORTS
 * ============================================================ */

/** Admin authentication - validates x-admin-auth header */
import adminAuth from "../middleware/adminAuth.js";

/** Multer upload - handles multipart/form-data for floor images */
import multerUpload from "../middleware/multerUpload.js";

/* ============================================================
 * CONTROLLER IMPORTS - FLOOR CRUD
 * ============================================================ */

import getFloors from "../controllers/floors/getFloors.js";
import getFloor from "../controllers/floors/getFloor.js";
import createFloor from "../controllers/floors/createFloor.js";
import updateFloor from "../controllers/floors/updateFloor.js";
import deleteFloor from "../controllers/floors/deleteFloor.js";

/* ============================================================
 * CONTROLLER IMPORTS - STATUS MANAGEMENT
 * ============================================================ */

import { 
  updateFloorStatus, 
  updateCameraStatus, 
  updateScreenStatus,
  getSystemStatus,
  bulkUpdateStatus,
  resetFloorCameras,
  resetAllCameras
} from "../controllers/floors/statusController.js";

/* ============================================================
 * APPLY AUTHENTICATION TO ALL ROUTES
 * All floor routes require admin authentication
 * ============================================================ */

router.use(adminAuth);

/* ============================================================
 * SYSTEM-WIDE ROUTES
 * Must be defined BEFORE parameterized routes to avoid conflicts
 * ============================================================ */

/**
 * @route GET /api/floors/system/status
 * @description Get complete system status overview
 * @returns {Object} Aggregated status of all floors, cameras, screens
 */
router.get("/system/status", getSystemStatus);

/**
 * @route POST /api/floors/system/bulk-status
 * @description Bulk update status for multiple items
 * @body {Object[]} items - Array of items to update
 * @body {string} status - New status to set
 */
router.post("/system/bulk-status", bulkUpdateStatus);

/**
 * @route POST /api/floors/system/cameras/reset
 * @description Reset ALL cameras across ALL floors
 * @warning System-wide operation - use with caution
 */
router.post("/system/cameras/reset", resetAllCameras);

/* ============================================================
 * FLOOR CRUD ROUTES
 * Standard Create, Read, Update, Delete operations
 * ============================================================ */

/**
 * @route GET /api/floors
 * @description Get all floor maps
 * @returns {Object[]} Array of floor objects
 */
router.route("/").get(getFloors);

/**
 * @route GET /api/floors/:id
 * @description Get a single floor by ID
 * @param {string} id - Floor ID
 * @returns {Object} Floor object
 */
router.route("/:id").get(getFloor);

/**
 * @route POST /api/floors
 * @description Create a new floor map
 * @consumes multipart/form-data
 * @body {string} id - Unique floor ID
 * @body {string} name - Floor name
 * @body {string} nodes - JSON array of graph nodes
 * @body {string} edges - JSON array of graph edges
 * @body {File} mapImage - Floor plan image file
 */
router.route("/").post(multerUpload.single("mapImage"), createFloor);

/**
 * @route PATCH /api/floors/:id
 * @description Update an existing floor
 * @consumes multipart/form-data
 * @param {string} id - Floor ID to update
 */
router.route("/:id").patch(multerUpload.single("mapImage"), updateFloor);

/**
 * @route DELETE /api/floors/:id
 * @description Delete a floor map
 * @param {string} id - Floor ID to delete
 */
router.route("/:id").delete(deleteFloor);

/* ============================================================
 * STATUS MANAGEMENT ROUTES
 * Enable/disable/maintenance mode for floors, cameras, screens
 * Must be AFTER /system routes to avoid route conflicts
 * ============================================================ */

/**
 * @route PUT /api/floors/:floorId/status
 * @description Update floor status (active/disabled/maintenance)
 * @param {string} floorId - Floor ID
 * @body {string} status - New status
 * @body {string} [reason] - Reason for status change
 */
router.put("/:floorId/status", updateFloorStatus);

/**
 * @route PUT /api/floors/:floorId/cameras/:cameraId/status
 * @description Update camera status
 * @param {string} floorId - Parent floor ID
 * @param {string} cameraId - Camera ID
 */
router.put("/:floorId/cameras/:cameraId/status", updateCameraStatus);

/**
 * @route PUT /api/floors/:floorId/screens/:screenId/status
 * @description Update screen status
 * @param {string} floorId - Parent floor ID
 * @param {string} screenId - Screen ID
 */
router.put("/:floorId/screens/:screenId/status", updateScreenStatus);

/**
 * @route POST /api/floors/:floorId/cameras/reset
 * @description Reset all cameras on a specific floor
 * @param {string} floorId - Floor ID
 */
router.post("/:floorId/cameras/reset", resetFloorCameras);

export default router;
