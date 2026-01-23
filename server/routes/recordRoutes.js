/**
 * @fileoverview Record Routes - API Endpoint Definitions
 * @description Defines endpoints for retrieving image/AI processing records.
 *              Records contain hazard detection results from camera feeds.
 * 
 * @requires express - Express.js framework
 * @requires adminAuth - Admin authentication middleware
 * 
 * @module routes/recordRoutes
 * @author Marcelino Saad
 * @version 1.0.0
 * 
 * @example
 * // Mount in server.js:
 * // app.use('/api/records', recordRoutes);
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

import getRecords from "../controllers/records/getRecords.js";
import getLatestRecord from "../controllers/records/getLatestRecord.js";

/* ============================================================
 * APPLY AUTHENTICATION TO ALL ROUTES
 * Record routes require admin authentication
 * ============================================================ */

router.use(adminAuth);

/* ============================================================
 * RECORD ROUTES
 * ============================================================ */

/**
 * @route GET /api/records?floorId=xxx&startDate=xxx&endDate=xxx
 * @description Get image records with optional date filtering
 * @query {string} floorId - Floor ID (required)
 * @query {string} [startDate] - ISO date string for range start
 * @query {string} [endDate] - ISO date string for range end
 * @returns {Object[]} Array of image records sorted by timestamp (newest first)
 */
router.route("/").get(getRecords);

/**
 * @route GET /api/records/latest?floorId=xxx
 * @description Get the most recent image record for a floor
 * @query {string} floorId - Floor ID (required)
 * @returns {Object} Most recent image record
 */
router.route("/latest").get(getLatestRecord);

export default router;