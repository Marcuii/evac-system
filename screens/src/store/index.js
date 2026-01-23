/**
 * @fileoverview Redux Store Configuration
 * @description Configures the Redux store with all application slices.
 *              Exports the store instance for use in Provider and direct dispatch.
 *
 * @module store
 * @author Marcelino Saad
 * @version 1.0.0
 *
 * @description
 * Store Structure:
 * ┌─────────────────────────────────────────────────────────────┐
 * │  connection : Network connection state (socket, USRP)       │
 * │  route      : Evacuation route data and emergency status    │
 * │  config     : Application configuration (server, screen)    │
 * │  log        : Debug log entries                             │
 * └─────────────────────────────────────────────────────────────┘
 */

import { configureStore } from '@reduxjs/toolkit';
import connectionReducer from './slices/connectionSlice';
import routeReducer from './slices/routeSlice';
import configReducer from './slices/configSlice';
import logReducer from './slices/logSlice';

/* ============================================================
 * STORE CONFIGURATION
 * ============================================================ */

/**
 * Redux store instance
 * @type {Object}
 */
export const store = configureStore({
  reducer: {
    /** Network connection state */
    connection: connectionReducer,
    /** Evacuation route data */
    route: routeReducer,
    /** Application configuration */
    config: configReducer,
    /** Debug log entries */
    log: logReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // Disable serializable check for non-serializable data (dates, etc.)
      serializableCheck: false,
    }),
});

export default store;
