/**
 * @fileoverview Settings Service
 * @description API service for system settings operations.
 *              Handles fetching and updating cloud sync and processing settings.
 *
 * @module services/settingsService
 * @author Marcelino Saad
 * @version 1.0.0
 *
 * @description
 * Available Operations:
 * ┌─────────────────────────────────────────────────────────────┐
 * │  getSettings()         - Fetch current system settings      │
 * │  updateSettings(data)  - Update system settings             │
 * │  triggerSync()         - Manually trigger cloud sync        │
 * └─────────────────────────────────────────────────────────────┘
 */

import api from './api';
import { API_CONFIG } from '../config';

const { ENDPOINTS } = API_CONFIG;

/* ============================================================
 * SETTINGS OPERATIONS
 * ============================================================ */

/**
 * Fetch current system settings from the server
 *
 * @async
 * @returns {Promise<Object>} Result with settings or error
 *
 * @example
 * const result = await getSettings();
 * if (result.success) {
 *   console.log('Cloud sync enabled:', result.data.cloudSync.enabled);
 * }
 */
export const getSettings = async () => {
  return api.get(ENDPOINTS.SETTINGS);
};

/**
 * Update system settings
 *
 * @async
 * @param {Object} settings - Settings to update
 * @param {Object} [settings.cloudSync] - Cloud sync settings
 * @param {boolean} [settings.cloudSync.enabled] - Enable/disable cloud sync
 * @param {number} [settings.cloudSync.intervalHours] - Sync interval in hours (1-168)
 * @param {Object} [settings.cloudProcessing] - Cloud processing settings
 * @param {boolean} [settings.cloudProcessing.enabled] - Enable/disable cloud upload & AI
 * @param {string} [settings.cloudProcessing.disabledReason] - Reason for disabling
 * @returns {Promise<Object>} Result with updated settings or error
 *
 * @example
 * const result = await updateSettings({
 *   cloudSync: { enabled: true, intervalHours: 6 },
 *   cloudProcessing: { enabled: false, disabledReason: 'Network issues' }
 * });
 */
export const updateSettings = async (settings) => {
  return api.put(ENDPOINTS.SETTINGS, settings);
};

/**
 * Manually trigger a cloud sync operation
 *
 * @async
 * @returns {Promise<Object>} Result with sync status or error
 *
 * @example
 * const result = await triggerSync();
 * if (result.success && result.data.success) {
 *   console.log('Synced', result.data.totalSynced, 'documents');
 * }
 */
export const triggerSync = async () => {
  return api.post(ENDPOINTS.SETTINGS_SYNC);
};

export default {
  getSettings,
  updateSettings,
  triggerSync,
};
