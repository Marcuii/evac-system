/**
 * @fileoverview Application Configuration Module
 * @description Centralized configuration constants loaded from environment variables.
 *              All configurable values should be imported from this module.
 *
 * @module config
 * @author Marcelino Saad
 * @version 1.0.0
 *
 * @example
 * import { API_CONFIG, STORAGE_KEYS } from './config';
 *
 * @description
 * Configuration Categories:
 * ┌─────────────────────────────────────────────────────────────┐
 * │  API_CONFIG       - Backend server connection settings      │
 * │  STORAGE_KEYS     - LocalStorage key names                  │
 * │  APP_CONFIG       - Application-wide settings               │
 * │  ROUTES           - Application route paths                 │
 * └─────────────────────────────────────────────────────────────┘
 *
 * Environment Variables (Vite requires VITE_ prefix):
 * - VITE_API_URL          : Backend server URL
 * - VITE_DEFAULT_TOKEN    : Default admin token for development
 * - VITE_APP_NAME         : Application display name
 */

/* ============================================================
 * API CONFIGURATION
 * Backend server connection settings
 * ============================================================ */

/**
 * @constant {Object} API_CONFIG
 * @property {string} BASE_URL - Backend API base URL
 * @property {number} TIMEOUT - Request timeout in milliseconds
 * @property {Object} ENDPOINTS - API endpoint paths
 */
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  TIMEOUT: parseInt(import.meta.env.VITE_API_TIMEOUT, 10) || 30000,
  ENDPOINTS: {
    // Health
    HEALTH: '/health',
    READY: '/ready',
    
    // Floors
    FLOORS: '/api/floors',
    FLOOR_BY_ID: (id) => `/api/floors/${id}`,
    FLOOR_STATUS: (id) => `/api/floors/${id}/status`,
    FLOOR_CAMERAS_RESET: (id) => `/api/floors/${id}/cameras/reset`,
    
    // Camera/Screen status
    CAMERA_STATUS: (floorId, camId) => `/api/floors/${floorId}/cameras/${camId}/status`,
    SCREEN_STATUS: (floorId, screenId) => `/api/floors/${floorId}/screens/${screenId}/status`,
    
    // System
    SYSTEM_STATUS: '/api/floors/system/status',
    SYSTEM_CAMERAS_RESET: '/api/floors/system/cameras/reset',
    SYSTEM_BULK_UPDATE: '/api/floors/system/bulk-update',
    
    // Routes
    ROUTES: '/api/routes',
    ROUTES_LATEST: '/api/routes/latest',
    ROUTES_COMPUTE: '/api/routes/compute',
    
    // Records
    RECORDS: '/api/records',
    RECORD_BY_ID: (id) => `/api/records/${id}`,
    RECORDS_BY_FLOOR: (floorId) => `/api/records?floorId=${floorId}`,
    
    // Settings
    SETTINGS: '/api/settings',
    SETTINGS_SYNC: '/api/settings/sync',
  },
};

/* ============================================================
 * STORAGE KEYS
 * LocalStorage key names for persistence
 * ============================================================ */

/**
 * @constant {Object} STORAGE_KEYS
 * @property {string} API_URL - Backend URL storage key
 * @property {string} ADMIN_TOKEN - Admin authentication token
 * @property {string} THEME - UI theme preference
 */
export const STORAGE_KEYS = {
  API_URL: 'ees_admin_api_url',
  ADMIN_TOKEN: 'ees_admin_token',
  THEME: 'ees_admin_theme',
  SIDEBAR_COLLAPSED: 'ees_admin_sidebar_collapsed',
};

/* ============================================================
 * APPLICATION CONFIGURATION
 * General application settings
 * ============================================================ */

/**
 * @constant {Object} APP_CONFIG
 * @property {string} NAME - Application display name
 * @property {string} VERSION - Application version
 * @property {number} REFRESH_INTERVAL - Auto-refresh interval in milliseconds
 */
export const APP_CONFIG = {
  NAME: import.meta.env.VITE_APP_NAME || 'EES Admin Dashboard',
  VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
  REFRESH_INTERVAL: parseInt(import.meta.env.VITE_REFRESH_INTERVAL, 10) || 30000,
  MAX_LOG_ENTRIES: parseInt(import.meta.env.VITE_MAX_LOG_ENTRIES, 10) || 100,
  TOAST_DURATION: parseInt(import.meta.env.VITE_TOAST_DURATION, 10) || 4000,
  PORT: parseInt(import.meta.env.VITE_PORT, 10) || 3030,
  SCREENS_URL: import.meta.env.VITE_SCREENS_URL || 'http://localhost:3000',
  MOCK_SERVICES_URL: import.meta.env.VITE_MOCK_SERVICES_URL || 'http://localhost:3002',
};

/* ============================================================
 * ROUTE PATHS
 * Application navigation routes
 * ============================================================ */

/**
 * @constant {Object} ROUTES
 * @description All application route paths
 */
export const ROUTES = {
  DASHBOARD: '/',
  FLOORS: '/floors',
  FLOOR_DETAIL: '/floors/:id',
  FLOOR_NEW: '/floors/new',
  FLOOR_EDIT: '/floors/:id/edit',
  ROUTES: '/routes',
  CAMERAS: '/cameras',
  RECORDS: '/records',
  SETTINGS: '/settings',
};

/* ============================================================
 * STATUS VALUES
 * Valid status values for different entities
 * ============================================================ */

/**
 * @constant {Object} STATUS
 * @description Valid status values for floors, cameras, and screens
 */
export const STATUS = {
  FLOOR: ['active', 'disabled', 'maintenance'],
  CAMERA: ['active', 'disabled', 'maintenance', 'error'],
  SCREEN: ['active', 'disabled', 'maintenance'],
};

/* ============================================================
 * NODE TYPES
 * Valid node types for floor graph
 * ============================================================ */

/**
 * @constant {Array} NODE_TYPES
 * @description Valid node types for floor plan graph
 */
export const NODE_TYPES = [
  { value: 'room', label: 'Room', icon: '🚪' },
  { value: 'hall', label: 'Hallway', icon: '🚶' },
  { value: 'door', label: 'Door', icon: '🚪' },
  { value: 'entrance', label: 'Entrance', icon: '🚪' },
  { value: 'exit', label: 'Exit', icon: '🚨' },
  { value: 'junction', label: 'Junction', icon: '➕' },
  { value: 'stairs', label: 'Stairs', icon: '🪜' },
  { value: 'elevator', label: 'Elevator', icon: '🛗' },
];

/**
 * Get API URL with optional saved override
 * @returns {string} API base URL
 */
export function getApiUrl() {
  const saved = localStorage.getItem(STORAGE_KEYS.API_URL);
  return saved || API_CONFIG.BASE_URL;
}

/**
 * Get admin token from localStorage
 * @returns {string} Admin token or default token from env
 */
export function getAdminToken() {
  return localStorage.getItem(STORAGE_KEYS.ADMIN_TOKEN) || 
         import.meta.env.VITE_DEFAULT_ADMIN_TOKEN || 
         '';
}

/**
 * Save API configuration to localStorage
 * @param {string} url - API URL
 * @param {string} token - Admin token
 */
export function saveApiConfig(url, token) {
  if (url) localStorage.setItem(STORAGE_KEYS.API_URL, url);
  if (token) localStorage.setItem(STORAGE_KEYS.ADMIN_TOKEN, token);
}

/* ============================================================
 * DETECTION TYPES
 * Valid detection types for AI records
 * ============================================================ */

/**
 * @constant {Array} DETECTION_TYPES
 * @description Valid detection types for AI records
 */
export const DETECTION_TYPES = [
  { value: 'fire', label: 'Fire', icon: '🔥' },
  { value: 'smoke', label: 'Smoke', icon: '💨' },
  { value: 'people', label: 'People', icon: '👥' },
];

/* ============================================================
 * RECORD STATUS
 * Valid status values for detection records
 * ============================================================ */

/**
 * @constant {Array} RECORD_STATUS
 * @description Valid status values for detection records
 */
export const RECORD_STATUS = [
  { value: 'new', label: 'New' },
  { value: 'processed', label: 'Processed' },
  { value: 'archived', label: 'Archived' },
];

/* ============================================================
 * STORAGE KEYS ALIAS
 * For compatibility
 * ============================================================ */

// Alias AUTH_TOKEN to ADMIN_TOKEN for compatibility with authSlice
STORAGE_KEYS.AUTH_TOKEN = STORAGE_KEYS.ADMIN_TOKEN;
