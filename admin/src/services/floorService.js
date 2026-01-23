/**
 * @fileoverview Floor Service
 * @description API service for floor management operations.
 *              Handles CRUD operations and status updates for floors.
 *
 * @module services/floorService
 * @author Marcelino Saad
 * @version 1.0.0
 *
 * @description
 * Available Operations:
 * ┌─────────────────────────────────────────────────────────────┐
 * │  getFloors()           - Fetch all floors                   │
 * │  getFloorById(id)      - Fetch single floor                 │
 * │  createFloor(data)     - Create new floor                   │
 * │  updateFloor(id, data) - Update existing floor              │
 * │  deleteFloor(id)       - Delete floor                       │
 * │  updateFloorStatus()   - Update floor status                │
 * │  updateCameraStatus()  - Update camera status               │
 * │  updateScreenStatus()  - Update screen status               │
 * │  getSystemStatus()     - Get system-wide status             │
 * │  resetFloorCameras()   - Reset all cameras on floor         │
 * └─────────────────────────────────────────────────────────────┘
 */

import api from './api';
import { API_CONFIG } from '../config';

const { ENDPOINTS } = API_CONFIG;

/* ============================================================
 * FLOOR CRUD OPERATIONS
 * ============================================================ */

/**
 * Fetch all floors from the server
 *
 * @async
 * @returns {Promise<Object>} Result with floors array or error
 *
 * @example
 * const result = await getFloors();
 * if (result.success) {
 *   console.log('Floors:', result.data);
 * }
 */
export const getFloors = async () => {
  return api.get(ENDPOINTS.FLOORS);
};

/**
 * Fetch a single floor by ID
 *
 * @async
 * @param {string} floorId - Floor ID to fetch
 * @returns {Promise<Object>} Result with floor data or error
 */
export const getFloorById = async (floorId) => {
  return api.get(ENDPOINTS.FLOOR_BY_ID(floorId));
};

/**
 * Create a new floor
 *
 * @async
 * @param {FormData} formData - Floor data as FormData (for file upload)
 * @returns {Promise<Object>} Result with created floor or error
 *
 * @description
 * FormData should include:
 * - id: Unique floor identifier
 * - name: Floor display name
 * - mapImage: Floor plan image file
 * - nodes: JSON string of graph nodes
 * - edges: JSON string of graph edges
 * - cameraToEdge: JSON string of camera mappings
 * - startPoints: JSON string of screen node IDs
 * - exitPoints: JSON string of exit node IDs
 * - widthMeters: Real-world width (optional)
 * - heightMeters: Real-world height (optional)
 */
export const createFloor = async (formData) => {
  return api.post(ENDPOINTS.FLOORS, formData);
};

/**
 * Update an existing floor
 *
 * @async
 * @param {string} floorId - Floor ID to update
 * @param {FormData} formData - Updated floor data
 * @returns {Promise<Object>} Result with updated floor or error
 */
export const updateFloor = async (floorId, formData) => {
  return api.patch(ENDPOINTS.FLOOR_BY_ID(floorId), formData);
};

/**
 * Delete a floor
 *
 * @async
 * @param {string} floorId - Floor ID to delete
 * @returns {Promise<Object>} Result with success or error
 */
export const deleteFloor = async (floorId) => {
  return api.delete(ENDPOINTS.FLOOR_BY_ID(floorId));
};

/* ============================================================
 * STATUS MANAGEMENT
 * ============================================================ */

/**
 * Update floor operational status
 *
 * @async
 * @param {string} floorId - Floor ID
 * @param {string} status - New status: 'active', 'disabled', 'maintenance'
 * @param {string} [reason] - Reason for status change
 * @returns {Promise<Object>} Result with updated status or error
 */
export const updateFloorStatus = async (floorId, status, reason = '') => {
  return api.put(ENDPOINTS.FLOOR_STATUS(floorId), { status, reason });
};

/**
 * Update camera status on a floor
 *
 * @async
 * @param {string} floorId - Floor ID
 * @param {string} cameraId - Camera ID
 * @param {string} status - New status: 'active', 'disabled', 'maintenance', 'error'
 * @param {string} [reason] - Reason for status change
 * @returns {Promise<Object>} Result with updated status or error
 */
export const updateCameraStatus = async (floorId, cameraId, status, reason = '') => {
  return api.put(ENDPOINTS.CAMERA_STATUS(floorId, cameraId), { status, reason });
};

/**
 * Update screen status on a floor
 *
 * @async
 * @param {string} floorId - Floor ID
 * @param {string} screenId - Screen ID
 * @param {string} status - New status: 'active', 'disabled', 'maintenance'
 * @param {string} [reason] - Reason for status change
 * @returns {Promise<Object>} Result with updated status or error
 */
export const updateScreenStatus = async (floorId, screenId, status, reason = '') => {
  return api.put(ENDPOINTS.SCREEN_STATUS(floorId, screenId), { status, reason });
};

/* ============================================================
 * SYSTEM-WIDE OPERATIONS
 * ============================================================ */

/**
 * Get system-wide status overview
 *
 * @async
 * @returns {Promise<Object>} Result with system status or error
 *
 * @description
 * Returns counts for:
 * - Total/active/disabled floors
 * - Total/active/error cameras
 * - Total/active screens
 */
export const getSystemStatus = async () => {
  return api.get(ENDPOINTS.SYSTEM_STATUS);
};

/**
 * Reset all cameras on a specific floor
 *
 * @async
 * @param {string} floorId - Floor ID
 * @returns {Promise<Object>} Result with reset count or error
 */
export const resetFloorCameras = async (floorId) => {
  return api.post(ENDPOINTS.FLOOR_CAMERAS_RESET(floorId));
};

/**
 * Reset all cameras across all floors
 *
 * @async
 * @returns {Promise<Object>} Result with reset count or error
 */
export const resetAllCameras = async () => {
  return api.post(ENDPOINTS.SYSTEM_CAMERAS_RESET);
};

/**
 * Bulk update multiple items
 *
 * @async
 * @param {Array} updates - Array of update objects
 * @returns {Promise<Object>} Result with update summary or error
 *
 * @example
 * const updates = [
 *   { floorId: 'floor_1', status: 'active' },
 *   { floorId: 'floor_2', cameraId: 'CAM_01', status: 'disabled' }
 * ];
 * await bulkUpdate(updates);
 */
export const bulkUpdate = async (updates) => {
  return api.post(ENDPOINTS.SYSTEM_BULK_UPDATE, { updates });
};

/* ============================================================
 * HELPER FUNCTIONS
 * ============================================================ */

/**
 * Build FormData for floor creation/update
 *
 * @param {Object} floorData - Floor data object
 * @param {File} [mapImage] - Floor plan image file
 * @returns {FormData} FormData object ready for API
 */
export const buildFloorFormData = (floorData, mapImage = null) => {
  const formData = new FormData();

  // Add basic fields
  if (floorData.id) formData.append('id', floorData.id);
  if (floorData.name) formData.append('name', floorData.name);
  if (floorData.status) formData.append('status', floorData.status);

  // Add JSON fields
  if (floorData.nodes) {
    formData.append('nodes', JSON.stringify(floorData.nodes));
  }
  if (floorData.edges) {
    formData.append('edges', JSON.stringify(floorData.edges));
  }
  if (floorData.cameraToEdge) {
    formData.append('cameraToEdge', JSON.stringify(floorData.cameraToEdge));
  }
  if (floorData.startPoints) {
    formData.append('startPoints', JSON.stringify(floorData.startPoints));
  }
  if (floorData.exitPoints) {
    formData.append('exitPoints', JSON.stringify(floorData.exitPoints));
  }

  // Add dimension fields
  if (floorData.widthMeters) {
    formData.append('widthMeters', floorData.widthMeters.toString());
  }
  if (floorData.heightMeters) {
    formData.append('heightMeters', floorData.heightMeters.toString());
  }

  // Add image file if provided
  if (mapImage) {
    formData.append('mapImage', mapImage);
  }

  return formData;
};
