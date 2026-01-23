/**
 * @fileoverview Settings Routes - API Endpoint Definitions
 * @description Defines all settings-related API endpoints including:
 *              - Settings retrieval
 *              - Settings update
 *              - Manual sync trigger
 * 
 * @requires express - Express.js framework
 * @requires adminAuth - Admin authentication middleware
 * 
 * @module routes/settingsRoutes
 * @author Marcelino Saad
 * @version 1.0.0
 * 
 * @example
 * // Mount in server.js:
 * // app.use('/api/settings', settingsRoutes);
 */

import express from "express";
const router = express.Router();

/* ============================================================
 * MIDDLEWARE IMPORTS
 * ============================================================ */

/** Admin authentication - validates x-admin-auth header */
import adminAuth from "../middleware/adminAuth.js";

/* ============================================================
 * CONTROLLER IMPORTS
 * ============================================================ */

import getSettings from "../controllers/settings/getSettings.js";
import updateSettings from "../controllers/settings/updateSettings.js";
import triggerSync from "../controllers/settings/triggerSync.js";

/* ============================================================
 * APPLY AUTHENTICATION TO ALL ROUTES
 * All settings routes require admin authentication
 * ============================================================ */
router.use(adminAuth);

/* ============================================================
 * SETTINGS ROUTES
 * ============================================================ */

/**
 * @route   GET /api/settings
 * @desc    Get current system settings
 * @access  Admin
 * @returns {Object} Current settings (cloudSync, cloudProcessing)
 */
router.get("/", getSettings);

/**
 * @route   PUT /api/settings
 * @desc    Update system settings
 * @access  Admin
 * @body    {Object} cloudSync - Cloud sync settings (enabled, intervalHours)
 * @body    {Object} cloudProcessing - Cloud processing settings (enabled, disabledReason)
 * @returns {Object} Updated settings
 */
router.put("/", updateSettings);

/**
 * @route   POST /api/settings/sync
 * @desc    Manually trigger a cloud sync operation
 * @access  Admin
 * @returns {Object} Sync result (success, duration, totalSynced)
 */
router.post("/sync", triggerSync);

export default router;
