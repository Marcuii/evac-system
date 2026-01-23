/**
 * @fileoverview Log Slice - Application Log State
 * @description Redux slice for managing application log entries displayed
 *              in the debug panel. Supports multiple log types and automatic
 *              trimming to prevent memory bloat.
 *
 * @module store/slices/logSlice
 * @author Marcelino Saad
 * @version 1.0.0
 *
 * @description
 * State Structure:
 * ┌─────────────────────────────────────────────────────────────┐
 * │  entries[] : Array of log entry objects                     │
 * └─────────────────────────────────────────────────────────────┘
 *
 * Log Entry Structure:
 * {
 *   id        : Unique identifier (timestamp + random)
 *   timestamp : Human-readable time string
 *   message   : Log message text
 *   type      : 'info' | 'success' | 'warning' | 'error'
 * }
 *
 * Log Types:
 * - info    : General information (blue)
 * - success : Operation completed (green)
 * - warning : Non-critical issue (yellow)
 * - error   : Critical error (red)
 */

import { createSlice } from '@reduxjs/toolkit';
import { LOG_CONFIG } from '../../config';

/* ============================================================
 * INITIAL STATE
 * ============================================================ */

/** @type {Object} Initial log state */
const initialState = {
  /** @type {Array} Log entries array */
  entries: [],
};

/* ============================================================
 * SLICE DEFINITION
 * ============================================================ */

const logSlice = createSlice({
  name: 'log',
  initialState,
  reducers: {
    /**
     * Add a new log entry
     * Automatically trims entries exceeding MAX_ENTRIES
     * @param {Object} action.payload - Log entry data
     * @param {string} action.payload.message - Log message text
     * @param {string} [action.payload.type='info'] - Log type
     */
    addLog: (state, action) => {
      const { message, type = 'info' } = action.payload;
      
      // Create unique log entry
      const entry = {
        id: Date.now() + Math.random(),
        timestamp: new Date().toLocaleTimeString(),
        message,
        type,
      };
      
      state.entries.push(entry);
      
      // Trim old entries to prevent memory bloat
      if (state.entries.length > LOG_CONFIG.MAX_ENTRIES) {
        state.entries = state.entries.slice(-LOG_CONFIG.MAX_ENTRIES);
      }
    },

    /**
     * Clear all log entries
     * Adds a "Log cleared" message after clearing
     */
    clearLogs: (state) => {
      state.entries = [
        {
          id: Date.now(),
          timestamp: new Date().toLocaleTimeString(),
          message: 'Log cleared',
          type: 'info',
        },
      ];
    },

    /**
     * Reset log state to initial empty state
     */
    resetLogs: () => initialState,
  },
});

/* ============================================================
 * EXPORTS
 * ============================================================ */

export const { addLog, clearLogs, resetLogs } = logSlice.actions;

export default logSlice.reducer;
