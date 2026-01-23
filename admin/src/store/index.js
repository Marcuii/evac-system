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
 * │  auth       : Authentication state (token, isAuthenticated) │
 * │  floors     : Floor management state (list, current, status)│
 * │  routes     : Evacuation routes state                       │
 * │  records    : AI detection records state                    │
 * │  ui         : UI state (sidebar, modals, toasts, loading)   │
 * └─────────────────────────────────────────────────────────────┘
 */

import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import floorsReducer from './slices/floorsSlice';
import routesReducer from './slices/routesSlice';
import recordsReducer from './slices/recordsSlice';
import uiReducer from './slices/uiSlice';

/* ============================================================
 * STORE CONFIGURATION
 * ============================================================ */

/**
 * Redux store instance
 * @type {Object}
 */
export const store = configureStore({
  reducer: {
    /** Authentication state */
    auth: authReducer,
    /** Floor management state */
    floors: floorsReducer,
    /** Evacuation routes state */
    routes: routesReducer,
    /** AI detection records state */
    records: recordsReducer,
    /** UI state (sidebar, modals, loading) */
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // Disable serializable check for non-serializable data (dates, etc.)
      serializableCheck: false,
    }),
  devTools: import.meta.env.DEV,
});

/**
 * @typedef {ReturnType<typeof store.getState>} RootState
 * @typedef {typeof store.dispatch} AppDispatch
 */

export default store;
