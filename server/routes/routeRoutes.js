/**
 * @fileoverview Route Routes - API Endpoint Definitions
 * @description Defines endpoints for retrieving computed evacuation routes.
 *              Routes contain pathfinding results from Dijkstra's algorithm.
 * 
 * @requires express - Express.js framework
 * 
 * @module routes/routeRoutes
 * @author Marcelino Saad
 * @version 1.0.0
 * 
 * @note These routes are PUBLIC (no authentication required)
 *       Screens need to fetch routes without admin credentials
 * 
 * @example
 * // Mount in server.js:
 * // app.use('/api/routes', routeRoutes);
 */

import express from "express";
const router = express.Router();

/* ============================================================
 * CONTROLLER IMPORTS
 * ============================================================ */

import getRoutes from "../controllers/routes/getRoutes.js";
import getLatestRoute from "../controllers/routes/getLatestRoute.js";

/* ============================================================
 * ROUTE ROUTES (PUBLIC - NO AUTH)
 * These endpoints are accessed by display screens which
 * don't have admin credentials. Security is via network
 * isolation (screens on internal network only).
 * ============================================================ */

/**
 * @route GET /api/routes?floorId=xxx
 * @description Get all computed routes for a floor (historical)
 * @query {string} floorId - Floor ID (required)
 * @returns {Object[]} Array of route objects sorted by computedAt (newest first)
 * @access Public
 */
router.route("/").get(getRoutes);

/**
 * @route GET /api/routes/latest?floorId=xxx
 * @description Get the most recently computed route for a floor
 * @query {string} floorId - Floor ID (required)
 * @returns {Object} Latest route with per-screen evacuation paths
 * @access Public
 * 
 * @description
 * This is the primary endpoint used by display screens.
 * Returns the current evacuation directions including:
 * - Path from each screen's location to nearest exit
 * - Hazard locations being avoided
 * - Edge weights (for visualization)
 */
router.route("/latest").get(getLatestRoute);

export default router;
