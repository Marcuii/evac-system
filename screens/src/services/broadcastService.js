/**
 * @fileoverview Broadcast Service - Local Screen Synchronization
 * @description Provides cross-tab/window communication for screens on the same device.
 *              Uses the BroadcastChannel API to sync route data from the controller
 *              to all open screen windows without network overhead.
 *
 * @requires BroadcastChannel - Web API for cross-context messaging
 *
 * @module services/broadcastService
 * @author Marcelino Saad
 * @version 1.0.0
 *
 * @description
 * Architecture:
 * ┌─────────────────────────────────────────────────────────────┐
 * │              Same-Device Screen Synchronization             │
 * ├─────────────────────────────────────────────────────────────┤
 * │                                                             │
 * │   ┌──────────────┐      BroadcastChannel                    │
 * │   │  Controller  │ ──────────────────────┐                  │
 * │   │ (LandingPage)│                       │                  │
 * │   └──────────────┘                       ▼                  │
 * │                              ┌───────────────────┐          │
 * │                              │  Screen Windows   │          │
 * │                              ├───────────────────┤          │
 * │                              │ Screen A │ Screen B│          │
 * │                              └───────────────────┘          │
 * │                                                             │
 * └─────────────────────────────────────────────────────────────┘
 *
 * Message Types:
 * - ROUTE_UPDATE     : New evacuation routes received
 * - REQUEST_DATA     : Screen requests current data on load
 * - connection_status: Controller backend connection state
 *
 * Usage:
 * 1. Controller (LandingPage) calls broadcastRouteData() on updates
 * 2. Screens call onRouteUpdate() to listen for route changes
 * 3. Screens call requestCurrentData() on mount for initial data
 */

import { BROADCAST_CONFIG } from '../config';

/* ============================================================
 * MODULE STATE
 * Private state for BroadcastChannel management
 * ============================================================ */

/** @type {BroadcastChannel|null} The shared broadcast channel instance */
let broadcastChannel = null;

/** @type {Array} Active message listeners for cleanup */
let listeners = [];

/* ============================================================
 * CHANNEL INITIALIZATION
 * ============================================================ */

/**
 * Initialize the broadcast channel for cross-tab communication
 * Creates a new BroadcastChannel if one doesn't exist
 *
 * @returns {BroadcastChannel|null} The channel instance or null if unsupported
 *
 * @example
 * const channel = initBroadcast();
 * if (channel) {
 *   console.log('Broadcast ready');
 * }
 */
export const initBroadcast = () => {
  if (broadcastChannel) return broadcastChannel;
  
  try {
    broadcastChannel = new BroadcastChannel(BROADCAST_CONFIG.CHANNEL_NAME);
    console.log('[Broadcast] Channel initialized:', BROADCAST_CONFIG.CHANNEL_NAME);
    return broadcastChannel;
  } catch (error) {
    console.error('[Broadcast] Failed to create channel:', error);
    return null;
  }
};

/* ============================================================
 * MESSAGE BROADCASTING
 * Functions to send messages to all screen windows
 * ============================================================ */

/**
 * Broadcast route data to all screen windows
 * Called by the controller when it receives new evacuation routes
 *
 * @param {Object} routeData - Route data to broadcast
 * @param {Array} routeData.routes - Array of evacuation routes
 * @param {string} routeData.floorId - Floor identifier
 * @param {Object} [routeData.floorData] - Floor map data for visualization
 * @param {boolean} [routeData.emergency] - Emergency state flag
 *
 * @example
 * broadcastRouteData({
 *   routes: [{ startNode: 'N1', exitNode: 'E1', path: [...] }],
 *   floorId: 'floor_1',
 *   emergency: true
 * });
 */
export const broadcastRouteData = (routeData) => {
  if (!broadcastChannel) {
    initBroadcast();
  }
  
  if (broadcastChannel) {
    const message = {
      type: 'ROUTE_UPDATE',
      payload: routeData,
      timestamp: new Date().toISOString(),
      source: 'controller'
    };
    
    broadcastChannel.postMessage(message);
    console.log('[Broadcast] Sent route update to screens:', routeData.routes?.length || 0, 'routes');
  }
};

/**
 * Send a generic message to all listeners
 * Used for custom message types like connection status
 *
 * @param {string} type - Message type identifier
 * @param {*} payload - Message payload data
 *
 * @example
 * broadcastMessage('connection_status', { connected: true });
 */
export const broadcastMessage = (type, payload) => {
  if (!broadcastChannel) {
    initBroadcast();
  }
  
  if (broadcastChannel) {
    broadcastChannel.postMessage({
      type,
      payload,
      timestamp: new Date().toISOString()
    });
  }
};

/* ============================================================
 * MESSAGE LISTENERS
 * Functions to subscribe to incoming messages
 * ============================================================ */

/**
 * Subscribe to route updates from the controller
 * Used by screen windows to receive evacuation routes
 *
 * @param {Function} callback - Handler for route data (routeData, timestamp)
 * @returns {Function} Unsubscribe function to clean up the listener
 *
 * @example
 * const unsubscribe = onRouteUpdate((routeData, timestamp) => {
 *   console.log('Routes received:', routeData.routes);
 * });
 *
 * // Later: cleanup
 * unsubscribe();
 */
export const onRouteUpdate = (callback) => {
  if (!broadcastChannel) {
    initBroadcast();
  }
  
  if (broadcastChannel) {
    const handler = (event) => {
      if (event.data.type === 'ROUTE_UPDATE') {
        callback(event.data.payload, event.data.timestamp);
      }
    };
    
    broadcastChannel.addEventListener('message', handler);
    listeners.push({ callback, handler });
    
    console.log('[Broadcast] Listening for route updates');
    
    return () => {
      broadcastChannel?.removeEventListener('message', handler);
      listeners = listeners.filter(l => l.callback !== callback);
    };
  }
  
  return () => {};
};

/**
 * Subscribe to any message type
 * Low-level listener for custom message handling
 *
 * @param {Function} callback - Handler for all messages
 * @returns {Function} Unsubscribe function
 */
export const onMessage = (callback) => {
  if (!broadcastChannel) {
    initBroadcast();
  }
  
  if (broadcastChannel) {
    const handler = (event) => {
      callback(event.data);
    };
    
    broadcastChannel.addEventListener('message', handler);
    
    return () => {
      broadcastChannel?.removeEventListener('message', handler);
    };
  }
  
  return () => {};
};

/**
 * Subscribe to controller connection status updates
 * Used by screens to know when the controller connects/disconnects from backend
 *
 * @param {Function} callback - Handler (connected: boolean, message: string)
 * @returns {Function} Unsubscribe function
 *
 * @example
 * const unsubscribe = onConnectionStatus((connected, message) => {
 *   if (!connected) {
 *     showDisconnectedBanner();
 *   }
 * });
 */
export const onConnectionStatus = (callback) => {
  if (!broadcastChannel) {
    initBroadcast();
  }
  
  if (broadcastChannel) {
    const handler = (event) => {
      if (event.data.type === 'connection_status') {
        const payload = event.data.payload || event.data;
        callback(payload.connected, payload.message);
      }
    };
    
    broadcastChannel.addEventListener('message', handler);
    
    return () => {
      broadcastChannel?.removeEventListener('message', handler);
    };
  }
  
  return () => {};
};

/* ============================================================
 * DATA REQUESTS
 * Request/response pattern for initial data loading
 * ============================================================ */

/**
 * Request current route data from the controller
 * Called by screens on mount to get the latest routes
 */
export const requestCurrentData = () => {
  broadcastMessage('REQUEST_DATA', { requestedAt: new Date().toISOString() });
};

/**
 * Subscribe to data requests from screens
 * Controller uses this to respond with current route data
 *
 * @param {Function} callback - Handler called when a screen requests data
 * @returns {Function} Unsubscribe function
 */
export const onDataRequest = (callback) => {
  if (!broadcastChannel) {
    initBroadcast();
  }
  
  if (broadcastChannel) {
    const handler = (event) => {
      if (event.data.type === 'REQUEST_DATA') {
        callback();
      }
    };
    
    broadcastChannel.addEventListener('message', handler);
    
    return () => {
      broadcastChannel?.removeEventListener('message', handler);
    };
  }
  
  return () => {};
};

/* ============================================================
 * CLEANUP
 * ============================================================ */

/**
 * Close the broadcast channel and clean up listeners
 * Should be called on component unmount or app shutdown
 */
export const closeBroadcast = () => {
  if (broadcastChannel) {
    broadcastChannel.close();
    broadcastChannel = null;
    listeners = [];
    console.log('[Broadcast] Channel closed');
  }
};

/* ============================================================
 * UTILITIES
 * ============================================================ */

/**
 * Check if BroadcastChannel API is supported
 * @returns {boolean} True if supported
 */
export const isBroadcastSupported = () => {
  return typeof BroadcastChannel !== 'undefined';
};

/* ============================================================
 * DEFAULT EXPORT
 * ============================================================ */

export default {
  initBroadcast,
  broadcastRouteData,
  broadcastMessage,
  onRouteUpdate,
  onMessage,
  onConnectionStatus,
  requestCurrentData,
  onDataRequest,
  closeBroadcast,
  isBroadcastSupported
};
