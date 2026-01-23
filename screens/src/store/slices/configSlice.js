/**
 * @fileoverview Config Slice - Application Configuration State
 * @description Redux slice for managing application configuration including
 *              server URL, screen ID, floor selection, and authentication.
 *              Persists settings to localStorage for session continuity.
 *
 * @module store/slices/configSlice
 * @author Marcelino Saad
 * @version 1.0.0
 *
 * @description
 * State Structure:
 * ┌─────────────────────────────────────────────────────────────┐
 * │  serverUrl    : Backend server URL                         │
 * │  screenId     : Current screen identifier                  │
 * │  floorId      : Selected floor identifier                  │
 * │  adminToken   : Authentication token for API access        │
 * │  floorData    : Loaded floor configuration (nodes, edges)  │
 * │  isInitialized: Whether floor data has been loaded         │
 * └─────────────────────────────────────────────────────────────┘
 *
 * Persistence: serverUrl, screenId, floorId, adminToken → localStorage
 */

import { createSlice } from '@reduxjs/toolkit';
import { SERVER_CONFIG } from '../../config';

/* ============================================================
 * LOCAL STORAGE HELPERS
 * ============================================================ */

/**
 * Load configuration from localStorage with fallbacks
 * @returns {Object} Configuration object with stored or default values
 * @private
 */
const loadFromStorage = () => {
  try {
    const serverUrl = localStorage.getItem('serverUrl') || SERVER_CONFIG.DEFAULT_URL;
    const screenId = localStorage.getItem('screenId') || SERVER_CONFIG.DEFAULT_SCREEN_ID;
    const floorId = localStorage.getItem('floorId') || '';
    const adminToken = localStorage.getItem('adminToken') || '';
    return { serverUrl, screenId, floorId, adminToken };
  } catch {
    // Fallback if localStorage is unavailable
    return {
      serverUrl: SERVER_CONFIG.DEFAULT_URL,
      screenId: SERVER_CONFIG.DEFAULT_SCREEN_ID,
      floorId: '',
      adminToken: '',
    };
  }
};

/* ============================================================
 * INITIAL STATE
 * ============================================================ */

/** @type {Object} Initial configuration state */
const initialState = {
  ...loadFromStorage(),
  /** @type {Object|null} Loaded floor data (nodes, edges, image, etc.) */
  floorData: null,
  /** @type {boolean} Whether floor data has been loaded */
  isInitialized: false,
};

/* ============================================================
 * SLICE DEFINITION
 * ============================================================ */

const configSlice = createSlice({
  name: 'config',
  initialState,
  reducers: {
    /**
     * Set backend server URL
     * @param {string} action.payload - Server URL
     */
    setServerUrl: (state, action) => {
      state.serverUrl = action.payload;
      localStorage.setItem('serverUrl', action.payload);
    },

    /**
     * Set current screen identifier
     * @param {string} action.payload - Screen ID (e.g., 'N1', 'N2')
     */
    setScreenId: (state, action) => {
      state.screenId = action.payload;
      localStorage.setItem('screenId', action.payload);
    },

    /**
     * Set selected floor identifier
     * @param {string} action.payload - Floor ID
     */
    setFloorId: (state, action) => {
      state.floorId = action.payload;
      localStorage.setItem('floorId', action.payload);
    },

    /**
     * Set admin authentication token
     * @param {string} action.payload - Admin token for API access
     */
    setAdminToken: (state, action) => {
      state.adminToken = action.payload;
      localStorage.setItem('adminToken', action.payload);
    },

    /**
     * Set loaded floor data
     * Also sets isInitialized to true when data is provided
     * @param {Object|null} action.payload - Floor data object
     */
    setFloorData: (state, action) => {
      state.floorData = action.payload;
      if (action.payload !== null) {
        state.isInitialized = true;
      }
    },

    /**
     * Set initialization state manually
     * @param {boolean} action.payload - Initialization state
     */
    setInitialized: (state, action) => {
      state.isInitialized = action.payload;
    },

    /**
     * Reset all configuration to defaults
     * Clears localStorage and returns to initial state
     */
    resetConfig: () => {
      localStorage.removeItem('serverUrl');
      localStorage.removeItem('screenId');
      localStorage.removeItem('floorId');
      localStorage.removeItem('adminToken');
      return {
        serverUrl: SERVER_CONFIG.DEFAULT_URL,
        screenId: SERVER_CONFIG.DEFAULT_SCREEN_ID,
        floorId: '',
        adminToken: '',
        floorData: null,
        isInitialized: false,
      };
    },
  },
});

/* ============================================================
 * EXPORTS
 * ============================================================ */

export const {
  setServerUrl,
  setScreenId,
  setFloorId,
  setAdminToken,
  setFloorData,
  setInitialized,
  resetConfig,
} = configSlice.actions;

export default configSlice.reducer;
