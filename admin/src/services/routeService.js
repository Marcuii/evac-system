/**
 * @fileoverview Route Service
 * @description API service for evacuation route operations.
 *              Handles fetching route history and triggering route computation.
 *
 * @module services/routeService
 * @author Marcelino Saad
 * @version 1.0.0
 */

import api from './api';
import { API_CONFIG } from '../config';

const { ENDPOINTS } = API_CONFIG;

/* ============================================================
 * ROUTE OPERATIONS
 * ============================================================ */

/**
 * Fetch route history for a floor
 *
 * @async
 * @param {string} floorId - Floor ID to fetch routes for
 * @returns {Promise<Object>} Result with routes array or error
 */
export const getRoutes = async (floorId) => {
  return api.get(ENDPOINTS.ROUTES, { floorId });
};

/**
 * Fetch the latest computed routes for a floor
 *
 * @async
 * @param {string} floorId - Floor ID
 * @returns {Promise<Object>} Result with latest routes or error
 *
 * @description
 * Returns the most recent route computation including:
 * - computedAt: Timestamp of computation
 * - routes: Array of evacuation routes
 * - hazardLevel: Overall hazard assessment
 * - emergency: Whether emergency mode is active
 */
export const getLatestRoutes = async (floorId) => {
  return api.get(ENDPOINTS.ROUTES_LATEST, { floorId });
};

/**
 * Manually trigger route computation for a floor
 *
 * @async
 * @param {string} floorId - Floor ID to compute routes for
 * @returns {Promise<Object>} Result with computed routes or error
 *
 * @description
 * Forces immediate route recalculation based on current:
 * - Camera feed analysis (people count, fire/smoke detection)
 * - Edge weights and thresholds
 * - Exit point availability
 */
export const computeRoutes = async (floorId) => {
  return api.post(ENDPOINTS.ROUTES_COMPUTE, { floorId });
};

/* ============================================================
 * HELPER FUNCTIONS
 * ============================================================ */

/**
 * Get hazard level from routes data
 *
 * @param {Object} routeData - Route data object
 * @returns {string} Hazard level: 'safe', 'low', 'moderate', 'high', 'critical'
 */
export const getHazardLevel = (routeData) => {
  if (!routeData) return 'unknown';
  
  if (routeData.emergency) return 'critical';
  
  return routeData.overallHazardLevel || routeData.hazardLevel || 'safe';
};

/**
 * Check if routes indicate an emergency
 *
 * @param {Object} routeData - Route data object
 * @returns {boolean} True if emergency mode is active
 */
export const isEmergency = (routeData) => {
  return routeData?.emergency === true;
};

/**
 * Format route path for display
 *
 * @param {Array} path - Array of node IDs
 * @returns {string} Formatted path string
 */
export const formatRoutePath = (path) => {
  if (!path || !Array.isArray(path)) return 'N/A';
  return path.join(' → ');
};
