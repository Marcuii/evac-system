/**
 * @fileoverview Record Service
 * @description API service for AI detection record operations.
 *              Handles fetching and managing detection records.
 *
 * @module services/recordService
 * @author Marcelino Saad
 * @version 1.0.0
 */

import api from './api';
import { API_CONFIG } from '../config';

const { ENDPOINTS } = API_CONFIG;

/* ============================================================
 * RECORD OPERATIONS
 * ============================================================ */

/**
 * Fetch records with optional filtering
 *
 * @async
 * @param {Object} params - Query parameters
 * @param {number} [params.page=1] - Page number
 * @param {number} [params.limit=20] - Items per page
 * @param {string} [params.floorId] - Filter by floor ID (REQUIRED by API)
 * @param {string} [params.cameraId] - Filter by camera ID
 * @param {string} [params.startDate] - Filter by start date (ISO string)
 * @param {string} [params.endDate] - Filter by end date (ISO string)
 * @returns {Promise<Object>} Result with records array and pagination info
 */
export const getRecords = async (params = {}) => {
  const queryParams = {};
  
  // floorId is required by the API - if not provided, we need to handle it
  if (params.floorId) queryParams.floorId = params.floorId;
  if (params.cameraId) queryParams.cameraId = params.cameraId;
  if (params.startDate) queryParams.startDate = params.startDate;
  if (params.endDate) queryParams.endDate = params.endDate;
  
  // Pagination params
  if (params.page) queryParams.page = params.page;
  if (params.limit) queryParams.limit = params.limit;
  
  return api.get(ENDPOINTS.RECORDS, queryParams);
};

/**
 * Fetch a single record by ID
 *
 * @async
 * @param {string} recordId - Record ID to fetch
 * @returns {Promise<Object>} Result with record data or error
 */
export const getRecordById = async (recordId) => {
  return api.get(ENDPOINTS.RECORD_BY_ID(recordId));
};

/**
 * Delete a record
 *
 * @async
 * @param {string} recordId - Record ID to delete
 * @returns {Promise<Object>} Result with success or error
 */
export const deleteRecord = async (recordId) => {
  return api.delete(ENDPOINTS.RECORD_BY_ID(recordId));
};

/**
 * Fetch records for a specific floor
 *
 * @async
 * @param {string} floorId - Floor ID
 * @param {Object} [params] - Additional query parameters
 * @returns {Promise<Object>} Result with records array
 */
export const getRecordsByFloor = async (floorId, params = {}) => {
  return getRecords({ ...params, floorId });
};

/* ============================================================
 * HELPER FUNCTIONS
 * ============================================================ */

/**
 * Get detection summary from a record
 *
 * @param {Object} record - Record object
 * @returns {Object} Summary with counts and flags
 */
export const getDetectionSummary = (record) => {
  return {
    peopleCount: record.analysis?.peopleCount || record.peopleCount || 0,
    fireDetected: record.analysis?.fireDetected || record.fireProb > 0.5,
    smokeDetected: record.analysis?.smokeDetected || record.smokeProb > 0.5,
    fireProb: record.analysis?.fireProb || record.fireProb || 0,
    smokeProb: record.analysis?.smokeProb || record.smokeProb || 0,
  };
};

/**
 * Check if record indicates a hazard
 *
 * @param {Object} record - Record object
 * @returns {boolean} True if fire or smoke detected
 */
export const isHazardRecord = (record) => {
  const summary = getDetectionSummary(record);
  return summary.fireDetected || summary.smokeDetected;
};

/**
 * Format probability as percentage
 *
 * @param {number} prob - Probability value (0-1)
 * @returns {string} Formatted percentage string
 */
export const formatProbability = (prob) => {
  if (prob === null || prob === undefined) return 'N/A';
  return `${(prob * 100).toFixed(1)}%`;
};
