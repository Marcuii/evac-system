/**
 * @fileoverview Floor Service - Floor Map Data API
 * @description Provides API calls for fetching floor configurations from the backend.
 *              Floor data includes map images, nodes, edges, screens, and exit points.
 *
 * @module services/floorService
 * @author Marcelino Saad
 * @version 1.0.0
 *
 * @description
 * Floor Data Structure:
 * ┌─────────────────────────────────────────────────────────────┐
 * │                      Floor Configuration                    │
 * ├─────────────────────────────────────────────────────────────┤
 * │  floorId      : Unique floor identifier                     │
 * │  name         : Display name (e.g., "Ground Floor")         │
 * │  imageUrl     : Floor map image for visualization           │
 * │  nodes[]      : Rooms, halls, and exits on the floor        │
 * │  edges[]      : Connections between nodes with weights      │
 * │  screens[]    : Screen display locations (node IDs)         │
 * │  exits[]      : Emergency exit node IDs                     │
 * └─────────────────────────────────────────────────────────────┘
 *
 * API Endpoints Used:
 * - GET /api/floors/:floorId - Fetch single floor data
 * - GET /api/floors          - Fetch all available floors
 * - GET /health              - Check server health status
 */

import { store } from '../store';
import { addLog } from '../store/slices/logSlice';

/* ============================================================
 * FLOOR DATA FETCHING
 * ============================================================ */

/**
 * Fetch floor data from the backend server
 * Returns complete floor configuration including nodes, edges, and map image
 *
 * @param {string} serverUrl - Backend server URL (e.g., 'http://localhost:3000')
 * @param {string} floorId - Floor identifier to fetch
 * @param {string} adminToken - Admin authentication token for API access
 * @returns {Promise<Object>} Result object with success flag and floor data or error
 *
 * @example
 * const result = await fetchFloorData('http://localhost:3000', 'floor_1', 'admin123');
 * if (result.success) {
 *   console.log('Floor loaded:', result.data.name);
 * }
 */
export const fetchFloorData = async (serverUrl, floorId, adminToken) => {
  try {
    store.dispatch(addLog({ 
      message: `📡 Fetching floor data for: ${floorId}`, 
      type: 'info' 
    }));

    const response = await fetch(`${serverUrl}/api/floors/${floorId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-auth': adminToken,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      const errorMsg = result.data?.message || result.message || 'Failed to fetch floor';
      store.dispatch(addLog({ 
        message: `✗ Floor fetch failed: ${errorMsg}`, 
        type: 'error' 
      }));
      return { success: false, error: errorMsg };
    }

    // Handle nested response structure from backend
    const floorData = result.data?.data || result.data;

    store.dispatch(addLog({ 
      message: `✓ Floor data loaded: ${floorData.name}`, 
      type: 'success' 
    }));

    return { 
      success: true, 
      data: floorData 
    };
  } catch (error) {
    store.dispatch(addLog({ 
      message: `✗ Network error: ${error.message}`, 
      type: 'error' 
    }));
    return { success: false, error: error.message };
  }
};

/**
 * Fetch all available floors from the server
 * Used for floor selection dropdown in the controller UI
 *
 * @param {string} serverUrl - Backend server URL
 * @param {string} adminToken - Admin authentication token
 * @returns {Promise<Object>} Result with array of floor objects or error
 *
 * @example
 * const result = await fetchAllFloors('http://localhost:3000', 'admin123');
 * if (result.success) {
 *   result.data.forEach(floor => console.log(floor.name));
 * }
 */
export const fetchAllFloors = async (serverUrl, adminToken) => {
  try {
    const response = await fetch(`${serverUrl}/api/floors`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-auth': adminToken,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      const errorMsg = result.data?.message || result.message || 'Failed to fetch floors';
      return { success: false, error: errorMsg };
    }

    // Handle nested response structure
    const floors = result.data?.data || result.data || [];
    return { success: true, data: floors };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/* ============================================================
 * SERVER HEALTH & VALIDATION
 * ============================================================ */

/**
 * Check server health and connectivity
 * Uses timeout to prevent hanging on unresponsive servers
 *
 * @param {string} serverUrl - Backend server URL to check
 * @returns {Promise<Object>} Health status with online, database, and version info
 *
 * @example
 * const health = await checkServerHealth('http://localhost:3000');
 * if (health.online && health.database) {
 *   console.log('Server is fully operational');
 * }
 */
export const checkServerHealth = async (serverUrl) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch(`${serverUrl}/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return { 
        online: true, 
        database: data.database?.status === 'connected',
        version: data.version 
      };
    }
    return { online: false };
  } catch {
    clearTimeout(timeoutId);
    return { online: false };
  }
};

/**
 * Validate admin authentication token
 * Tests token by attempting to access a protected endpoint
 *
 * @param {string} serverUrl - Backend server URL
 * @param {string} adminToken - Token to validate
 * @returns {Promise<boolean>} True if token is valid and grants access
 */
export const validateAdminToken = async (serverUrl, adminToken) => {
  try {
    const response = await fetch(`${serverUrl}/api/floors`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-auth': adminToken,
      },
    });

    // Token is valid if we don't get a 403 Forbidden
    return response.ok || response.status !== 403;
  } catch {
    return false;
  }
};

/* ============================================================
 * DEFAULT EXPORT
 * ============================================================ */

export default {
  fetchFloorData,
  fetchAllFloors,
  checkServerHealth,
  validateAdminToken,
};
