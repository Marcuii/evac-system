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
 * import { SERVER_CONFIG, USRP_CONFIG, CONNECTION_CONFIG } from '@/config';
 *
 * @description
 * Configuration Categories:
 * ┌─────────────────────────────────────────────────────────────┐
 * │  SERVER_CONFIG     - Backend server connection settings     │
 * │  USRP_CONFIG       - USRP bridge service settings           │
 * │  CONNECTION_CONFIG - Socket reconnection parameters         │
 * │  LOG_CONFIG        - Logging and debug settings             │
 * │  BROADCAST_CONFIG  - Screen synchronization settings        │
 * └─────────────────────────────────────────────────────────────┘
 *
 * Environment Variables (Vite requires VITE_ prefix):
 * - VITE_DEFAULT_SERVER_URL   : Backend server URL
 * - VITE_DEFAULT_SCREEN_ID    : Default screen ID for testing
 * - VITE_USRP_BRIDGE_PORT     : USRP bridge service port
 * - VITE_MAX_RECONNECT_ATTEMPTS: Max attempts before USRP fallback
 * - VITE_RECONNECT_DELAY      : Delay between attempts (ms)
 * - VITE_SERVER_CHECK_INTERVAL: Health check interval (ms)
 * - VITE_BRIDGE_CHECK_INTERVAL: Bridge status check interval (ms)
 * - VITE_MAX_LOG_ENTRIES      : Max log entries in memory
 * - VITE_BROADCAST_CHANNEL_NAME: BroadcastChannel name
 */

/* ============================================================
 * SERVER CONFIGURATION
 * Backend server connection and authentication settings
 * ============================================================ */

/**
 * @constant {Object} SERVER_CONFIG
 * @property {string} DEFAULT_URL - Default backend server URL
 * @property {string} DEFAULT_SCREEN_ID - Default screen ID for testing
 */
export const SERVER_CONFIG = {
  DEFAULT_URL: import.meta.env.VITE_DEFAULT_SERVER_URL || 'http://localhost:3000',
  DEFAULT_SCREEN_ID: import.meta.env.VITE_DEFAULT_SCREEN_ID || 'N1',
};

/* ============================================================
 * USRP BRIDGE CONFIGURATION
 * USRP bridge service connection settings for radio fallback
 * ============================================================ */

/**
 * @constant {Object} USRP_CONFIG
 * @property {number} BRIDGE_PORT - USRP bridge service port
 * @property {number} SSE_RECONNECT_DELAY - SSE reconnection delay in milliseconds
 * @property {number} RELAY_RECONNECT_DELAY - Relay socket reconnection delay in milliseconds
 */
export const USRP_CONFIG = {
  BRIDGE_PORT: parseInt(import.meta.env.VITE_USRP_BRIDGE_PORT, 10) || 3062,
  SSE_RECONNECT_DELAY: parseInt(import.meta.env.VITE_SSE_RECONNECT_DELAY, 10) || 3000,
  RELAY_RECONNECT_DELAY: parseInt(import.meta.env.VITE_RELAY_RECONNECT_DELAY, 10) || 1000,
};

/**
 * Resolve USRP bridge URL based on current hostname
 * Uses localhost for development, network IP for deployed screens
 * @returns {string} Bridge URL
 */
export const getBridgeUrl = () => {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  const host = isLocalhost ? 'localhost' : hostname;
  return `http://${host}:${USRP_CONFIG.BRIDGE_PORT}`;
};

/* ============================================================
 * CONNECTION CONFIGURATION
 * Socket reconnection and heartbeat parameters
 * ============================================================ */

/**
 * @constant {Object} CONNECTION_CONFIG
 * @property {number} MAX_RECONNECT_ATTEMPTS - Max attempts before USRP fallback
 * @property {number} RECONNECT_DELAY - Delay between attempts in milliseconds
 * @property {number} SERVER_CHECK_INTERVAL - Health check interval in milliseconds
 * @property {number} BRIDGE_CHECK_INTERVAL - Bridge status check interval in milliseconds
 */
export const CONNECTION_CONFIG = {
  MAX_RECONNECT_ATTEMPTS: parseInt(import.meta.env.VITE_MAX_RECONNECT_ATTEMPTS, 10) || 5,
  RECONNECT_DELAY: parseInt(import.meta.env.VITE_RECONNECT_DELAY, 10) || 3000,
  SERVER_CHECK_INTERVAL: parseInt(import.meta.env.VITE_SERVER_CHECK_INTERVAL, 10) || 10000,
  BRIDGE_CHECK_INTERVAL: parseInt(import.meta.env.VITE_BRIDGE_CHECK_INTERVAL, 10) || 15000,
};

/* ============================================================
 * LOGGING CONFIGURATION
 * Debug log and monitoring settings
 * ============================================================ */

/**
 * @constant {Object} LOG_CONFIG
 * @property {number} MAX_ENTRIES - Maximum log entries to keep in memory
 */
export const LOG_CONFIG = {
  MAX_ENTRIES: parseInt(import.meta.env.VITE_MAX_LOG_ENTRIES, 10) || 200,
};

/* ============================================================
 * BROADCAST CONFIGURATION
 * Screen synchronization via BroadcastChannel API
 * ============================================================ */

/**
 * @constant {Object} BROADCAST_CONFIG
 * @property {string} CHANNEL_NAME - BroadcastChannel name for screen sync
 */
export const BROADCAST_CONFIG = {
  CHANNEL_NAME: import.meta.env.VITE_BROADCAST_CHANNEL_NAME || 'ees-screen-sync',
};

/* ============================================================
 * DEFAULT EXPORTS
 * ============================================================ */

export default {
  SERVER_CONFIG,
  USRP_CONFIG,
  CONNECTION_CONFIG,
  LOG_CONFIG,
  BROADCAST_CONFIG,
  getBridgeUrl,
};
