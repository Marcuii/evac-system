/**
 * @fileoverview Connection Slice - Network Connection State
 * @description Redux slice for managing WebSocket and USRP connection states.
 *              Tracks connection status, heartbeat, and data source mode.
 *
 * @module store/slices/connectionSlice
 * @author Marcelino Saad
 * @version 1.0.0
 *
 * @description
 * State Structure:
 * ┌─────────────────────────────────────────────────────────────┐
 * │  isConnected    : Active connection to backend              │
 * │  isConnecting   : Connection attempt in progress            │
 * │  lastHeartbeat  : Timestamp of last heartbeat received      │
 * │  heartbeatActive: Whether heartbeat monitoring is active    │
 * │  usrpMode       : Whether using USRP radio fallback         │
 * │  dataSource     : Current data source ('socket' | 'usrp')   │
 * │  error          : Last connection error message             │
 * └─────────────────────────────────────────────────────────────┘
 *
 * Connection Flow:
 * 1. setConnecting → Connection attempt starts
 * 2. setConnected  → Socket connected, using socket data source
 * 3. setDisconnected → Socket lost, may switch to USRP mode
 */

import { createSlice } from '@reduxjs/toolkit';

/* ============================================================
 * INITIAL STATE
 * ============================================================ */

/** @type {Object} Initial connection state */
const initialState = {
  /** @type {boolean} Whether connected to backend */
  isConnected: false,
  /** @type {boolean} Whether connection attempt is in progress */
  isConnecting: false,
  /** @type {string|null} Timestamp of last heartbeat */
  lastHeartbeat: null,
  /** @type {boolean} Whether heartbeat monitoring is active */
  heartbeatActive: false,
  /** @type {boolean} Whether using USRP radio fallback */
  usrpMode: false,
  /** @type {string|null} Current data source: 'socket' or 'usrp' */
  dataSource: null,
  /** @type {string|null} Last connection error message */
  error: null,
};

/* ============================================================
 * SLICE DEFINITION
 * ============================================================ */

const connectionSlice = createSlice({
  name: 'connection',
  initialState,
  reducers: {
    /**
     * Set connecting state
     * Called when starting a connection attempt
     */
    setConnecting: (state) => {
      state.isConnecting = true;
      state.error = null;
    },

    /**
     * Set connected state
     * Called when WebSocket connection is established
     */
    setConnected: (state) => {
      state.isConnected = true;
      state.isConnecting = false;
      state.usrpMode = false;
      state.dataSource = 'socket';
      state.error = null;
    },

    /**
     * Set disconnected state
     * Called when WebSocket connection is lost
     * Note: Does not auto-enable USRP, let reconnection logic handle it
     */
    setDisconnected: (state) => {
      state.isConnected = false;
      state.isConnecting = false;
      state.heartbeatActive = false;
    },

    /**
     * Update heartbeat timestamp
     * Called when heartbeat signal is received from server
     * @param {string} action.payload - Heartbeat timestamp
     */
    setHeartbeat: (state, action) => {
      state.lastHeartbeat = action.payload;
      state.heartbeatActive = true;
    },

    /**
     * Set USRP mode state
     * Called when switching to/from radio fallback mode
     * @param {boolean} action.payload - Whether USRP mode is active
     */
    setUsrpMode: (state, action) => {
      state.usrpMode = action.payload;
      if (action.payload) {
        state.dataSource = 'usrp';
      }
    },

    /**
     * Set data source directly
     * @param {string} action.payload - Data source: 'socket' or 'usrp'
     */
    setDataSource: (state, action) => {
      state.dataSource = action.payload;
    },

    /**
     * Set connection error
     * @param {string} action.payload - Error message
     */
    setConnectionError: (state, action) => {
      state.error = action.payload;
      state.isConnecting = false;
    },

    /**
     * Reset connection state to initial values
     */
    resetConnection: () => initialState,
  },
});

/* ============================================================
 * EXPORTS
 * ============================================================ */

export const {
  setConnecting,
  setConnected,
  setDisconnected,
  setHeartbeat,
  setUsrpMode,
  setDataSource,
  setConnectionError,
  resetConnection,
} = connectionSlice.actions;

export default connectionSlice.reducer;
