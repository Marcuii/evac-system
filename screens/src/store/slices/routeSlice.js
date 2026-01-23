/**
 * @fileoverview Route Slice - Evacuation Route State
 * @description Redux slice for managing evacuation route data received from
 *              the backend server or USRP radio. Stores routes, emergency
 *              status, and hazard information.
 *
 * @module store/slices/routeSlice
 * @author Marcelino Saad
 * @version 1.0.0
 *
 * @description
 * State Structure:
 * ┌─────────────────────────────────────────────────────────────┐
 * │  routes[]         : All received evacuation routes          │
 * │  currentRoute     : Route for current screen (filtered)     │
 * │  allRoutes[]      : Copy of all routes for reference        │
 * │  emergency        : Whether emergency mode is active        │
 * │  emergencyType    : Type of emergency (fire, flood, etc.)   │
 * │  emergencyLocation: Location of emergency                   │
 * │  overallHazardLevel: Floor-wide hazard level                │
 * │  floorName        : Display name of current floor           │
 * │  floorId          : Identifier of current floor             │
 * │  timestamp        : Server timestamp of route data          │
 * │  lastUpdated      : Local timestamp of last update          │
 * │  source           : Data source ('socket' | 'usrp')         │
 * └─────────────────────────────────────────────────────────────┘
 *
 * Route Object Structure:
 * {
 *   startNode: 'N1',           // Screen/starting node ID
 *   exitNode: 'E1',            // Designated exit node
 *   path: ['N1', 'N2', 'E1'],  // Full path from start to exit
 *   distance: 150,             // Path distance in meters
 *   hazardLevel: 'safe',       // Route hazard level
 *   blocked: false,            // Whether route is blocked
 * }
 */

import { createSlice } from '@reduxjs/toolkit';

/* ============================================================
 * INITIAL STATE
 * ============================================================ */

/** @type {Object} Initial route state */
const initialState = {
  /** @type {Array} All evacuation routes */
  routes: [],
  /** @type {Object|null} Route for current screen */
  currentRoute: null,
  /** @type {Array} Copy of all routes for reference */
  allRoutes: [],
  /** @type {boolean} Whether emergency mode is active */
  emergency: false,
  /** @type {string|null} Type of emergency */
  emergencyType: null,
  /** @type {string|null} Location of emergency */
  emergencyLocation: null,
  /** @type {string} Floor-wide hazard level */
  overallHazardLevel: 'safe',
  /** @type {string|null} Display name of floor */
  floorName: null,
  /** @type {string|null} Floor identifier */
  floorId: null,
  /** @type {string|null} Server timestamp of data */
  timestamp: null,
  /** @type {string|null} Local timestamp of last update */
  lastUpdated: null,
  /** @type {string|null} Data source identifier */
  source: null,
};

/* ============================================================
 * SLICE DEFINITION
 * ============================================================ */

const routeSlice = createSlice({
  name: 'route',
  initialState,
  reducers: {
    /**
     * Set complete route update from server/USRP
     * Automatically filters route for current screen if screenId provided
     * @param {Object} action.payload - Route update data
     * @param {Array} action.payload.routes - Array of route objects
     * @param {boolean} action.payload.emergency - Emergency mode flag
     * @param {string} [action.payload.emergencyType] - Type of emergency
     * @param {string} [action.payload.emergencyLocation] - Emergency location
     * @param {string} [action.payload.overallHazardLevel] - Floor hazard level
     * @param {string} [action.payload.floorName] - Floor display name
     * @param {string} [action.payload.floorId] - Floor identifier
     * @param {string} [action.payload.timestamp] - Server timestamp
     * @param {string} [action.payload.screenId] - Current screen ID for filtering
     * @param {string} [action.payload.source] - Data source identifier
     */
    setRouteUpdate: (state, action) => {
      const { 
        routes, 
        emergency, 
        emergencyType,
        emergencyLocation,
        overallHazardLevel, 
        floorName, 
        floorId, 
        timestamp, 
        screenId,
        source 
      } = action.payload;
      
      // Update all route data
      state.routes = routes || [];
      state.allRoutes = routes || [];
      state.emergency = emergency;
      state.emergencyType = emergencyType;
      state.emergencyLocation = emergencyLocation;
      state.overallHazardLevel = overallHazardLevel;
      state.floorName = floorName;
      state.floorId = floorId;
      state.timestamp = timestamp;
      state.lastUpdated = timestamp || new Date().toISOString();
      state.source = source;
      
      // Filter route for current screen if screenId provided
      if (screenId && routes) {
        const myRoute = routes.find(route => route.startNode === screenId);
        if (myRoute) {
          state.currentRoute = {
            ...myRoute,
            emergency,
            emergencyType,
            emergencyLocation,
            overallHazardLevel,
            floorName,
            receivedAt: state.lastUpdated,
          };
        }
      }
    },

    /**
     * Set current route directly
     * Used when manually selecting a route for display
     * @param {Object} action.payload - Route object
     */
    setCurrentRoute: (state, action) => {
      state.currentRoute = action.payload;
    },

    /**
     * Clear current route and emergency state
     * Maintains floor information
     */
    clearRoute: (state) => {
      state.currentRoute = null;
      state.routes = [];
      state.allRoutes = [];
      state.emergency = false;
      state.emergencyType = null;
      state.emergencyLocation = null;
      state.overallHazardLevel = 'safe';
    },

    /**
     * Reset all route state to initial values
     */
    resetRoutes: () => initialState,
  },
});

/* ============================================================
 * EXPORTS
 * ============================================================ */

export const {
  setRouteUpdate,
  setCurrentRoute,
  clearRoute,
  resetRoutes,
} = routeSlice.actions;

export default routeSlice.reducer;
