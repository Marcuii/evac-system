/**
 * @fileoverview USRP Service - Radio Interface & Screen Relay
 * @description Provides communication with the USRP Bridge for radio-based
 *              route data reception and manages the internal relay socket
 *              for multi-screen synchronization across network.
 *
 * @requires socket.io-client - For WebSocket relay connections
 * @requires Redux store - For state management
 *
 * @module services/usrpService
 * @author Marcelino Saad
 * @version 1.0.0
 *
 * @description
 * System Architecture:
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │                        USRP Data Flow & Screen Relay                        │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │                                                                             │
 * │   ┌───────────┐         ┌─────────────┐         ┌──────────────┐           │
 * │   │ rx_ofdm.py│  SSE    │  USRP Bridge │  Socket │  Controller  │           │
 * │   │  (Radio)  │ ───────▶│   (Node.js)  │ ◀──────▶│ (LandingPage)│           │
 * │   └───────────┘         └─────────────┘         └──────────────┘           │
 * │                                │                        │                   │
 * │                                │ Relay Socket           │ BroadcastChannel  │
 * │                                │                        │                   │
 * │                                ▼                        ▼                   │
 * │                         ┌──────────────────────────────────────┐           │
 * │                         │            Screen Clients            │           │
 * │                         │   (Network via Relay OR Local via BC)│           │
 * │                         └──────────────────────────────────────┘           │
 * │                                                                             │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * Two Operation Modes:
 * 1. Socket Mode - Server is online, data comes via WebSocket from backend
 * 2. USRP Mode   - Server offline, data comes via radio from USRP
 *
 * Screen Relay:
 * - Controller broadcasts route updates to screens via internal relay socket
 * - Works across network (different devices) unlike BroadcastChannel
 * - BroadcastChannel is used for same-device sync (faster)
 */

import { io as socketIO } from 'socket.io-client';
import { store } from '../store';
import { setRouteUpdate } from '../store/slices/routeSlice';
import { setUsrpMode, setDataSource } from '../store/slices/connectionSlice';
import { addLog } from '../store/slices/logSlice';
import { getBridgeUrl, USRP_CONFIG } from '../config';

/* ============================================================
 * MODULE STATE
 * Private state for USRP and relay connections
 * ============================================================ */

/** @type {string} Resolved bridge URL */
const BRIDGE_URL = getBridgeUrl();
console.log('[USRP Service] Bridge URL:', BRIDGE_URL);

/** @type {EventSource|null} SSE connection to USRP bridge */
let eventSource = null;

/** @type {string|null} Last processed file content (deduplication) */
let lastFileContent = null;

/** @type {NodeJS.Timeout|null} Reconnect timeout handle */
let reconnectTimeout = null;

/** @type {boolean} Whether rx_ofdm.py is currently running */
let isRxRunning = false;

/** @type {Object} Socket.IO client for screen relay */
let relaySocket = null;

/** @type {Object} Callbacks for relay events */
let relayCallbacks = {
  onRouteData: null,
  onScreenConnected: null,
  onScreenDisconnected: null
};

/* ============================================================
 * DATA PARSING
 * ============================================================ */

/**
 * Parse USRP data from the padded results file
 * rx_ofdm.py outputs data_rx.json with padding lines for reliable framing
 *
 * @param {string} content - Raw file content with padding
 * @returns {Object|null} Parsed JSON data or null if parsing fails
 *
 * @description
 * File format:
 * ===============================
 * {"routes": [...], "floorId": "..."}
 * ===============================
 */
export const parseUsrpData = (content) => {
  try {
    // Remove padding lines (lines of '=' characters)
    const lines = content.split('\n');
    const jsonLines = lines.filter(line => !line.match(/^=+$/) && line.trim());
    const jsonStr = jsonLines.join('\n');
    
    if (!jsonStr) {
      return null;
    }
    
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('[USRP] Failed to parse data:', error);
    store.dispatch(addLog({ 
      message: `Failed to parse USRP data: ${error.message}`, 
      type: 'error' 
    }));
    return null;
  }
};

/* ============================================================
 * DATA PROCESSING
 * ============================================================ */

/**
 * Process received USRP route data and dispatch to Redux store
 * Handles deduplication and logs relevant route information
 *
 * @param {Object} data - Route data from USRP
 * @param {string} [source='USRP'] - Data source identifier for logging
 * @returns {boolean} True if data was new and processed, false if duplicate
 * @private
 */
const processUsrpData = (data, source = 'USRP') => {
  const state = store.getState();
  const screenId = state.config.screenId;
  
  // Deduplicate - skip if content hasn't changed
  const contentStr = JSON.stringify(data);
  if (contentStr === lastFileContent) {
    return false;
  }
  lastFileContent = contentStr;
  
  store.dispatch(addLog({ 
    message: `📡 Route update received via ${source}`, 
    type: 'info' 
  }));
  store.dispatch(setUsrpMode(true));
  store.dispatch(setDataSource('usrp'));
  
  // Dispatch route update to store
  store.dispatch(setRouteUpdate({
    ...data,
    screenId,
    source,
  }));
  
  // Log route information for this screen
  const myRoute = data.routes?.find(route => route.startNode === screenId);
  if (myRoute) {
    store.dispatch(addLog({ 
      message: `Route found for ${screenId}: Exit ${myRoute.exitNode}`, 
      type: 'success' 
    }));
  } else {
    store.dispatch(addLog({ 
      message: `No route found for screen ${screenId} in USRP data`, 
      type: 'warning' 
    }));
  }
  
  return true;
};

/* ============================================================
 * BRIDGE STATUS & CONTROL
 * ============================================================ */

/**
 * Check if USRP Bridge service is available
 * Uses AbortController with timeout to prevent hanging requests
 *
 * @returns {Promise<Object>} Status object with available flag and bridge state
 *
 * @example
 * const status = await checkBridgeStatus();
 * if (status.available) {
 *   console.log('Bridge is running');
 * }
 */
export const checkBridgeStatus = async () => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000);
  
  try {
    const response = await fetch(`${BRIDGE_URL}/status`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const status = await response.json();
      return { available: true, ...status };
    }
    return { available: false };
  } catch {
    clearTimeout(timeoutId);
    return { available: false };
  }
};

/**
 * Start rx_ofdm.py via the bridge service (single execution)
 * Runs once and waits for radio reception
 *
 * @returns {Promise<Object>} Result with success flag and PID or error
 */
export const startRxOfdm = async () => {
  try {
    store.dispatch(addLog({ 
      message: '🚀 Starting rx_ofdm.py via bridge...', 
      type: 'info' 
    }));
    
    const response = await fetch(`${BRIDGE_URL}/start`, { method: 'POST' });
    const result = await response.json();
    
    if (result.success) {
      isRxRunning = true;
      store.dispatch(addLog({ 
        message: `✓ rx_ofdm.py started (PID: ${result.pid})`, 
        type: 'success' 
      }));
      return { success: true, pid: result.pid };
    } else {
      store.dispatch(addLog({ 
        message: `✗ Failed to start: ${result.error}`, 
        type: 'error' 
      }));
      return { success: false, error: result.error };
    }
  } catch (error) {
    store.dispatch(addLog({ 
      message: `✗ Bridge error: ${error.message}`, 
      type: 'error' 
    }));
    return { success: false, error: error.message };
  }
};

/**
 * Start rx_ofdm.py in loop mode (auto-restart after each reception)
 * Used for continuous monitoring when server is offline
 *
 * @returns {Promise<Object>} Result with success flag and PID or error
 */
export const startRxLoop = async () => {
  try {
    store.dispatch(addLog({ 
      message: '🔄 Starting rx_ofdm.py in loop mode...', 
      type: 'info' 
    }));
    
    const response = await fetch(`${BRIDGE_URL}/loop/start`, { method: 'POST' });
    const result = await response.json();
    
    if (result.success) {
      isRxRunning = true;
      store.dispatch(addLog({ 
        message: `✓ Loop mode enabled (PID: ${result.pid})`, 
        type: 'success' 
      }));
      return { success: true, pid: result.pid };
    } else {
      store.dispatch(addLog({ 
        message: `✗ Failed to start loop: ${result.error}`, 
        type: 'error' 
      }));
      return { success: false, error: result.error };
    }
  } catch (error) {
    store.dispatch(addLog({ 
      message: `✗ Bridge error: ${error.message}`, 
      type: 'error' 
    }));
    return { success: false, error: error.message };
  }
};

/**
 * Stop rx_ofdm.py via the bridge service
 * Also stops loop mode if active
 *
 * @returns {Promise<Object>} Result with success flag
 */
export const stopRxOfdm = async () => {
  try {
    store.dispatch(addLog({ 
      message: '🛑 Stopping rx_ofdm.py...', 
      type: 'info' 
    }));
    
    const response = await fetch(`${BRIDGE_URL}/stop`, { method: 'POST' });
    const result = await response.json();
    
    if (result.success) {
      isRxRunning = false;
      store.dispatch(addLog({ 
        message: '✓ rx_ofdm.py stopped', 
        type: 'success' 
      }));
      return { success: true };
    } else {
      store.dispatch(addLog({ 
        message: `✗ Failed to stop: ${result.error}`, 
        type: 'warning' 
      }));
      return { success: false, error: result.error };
    }
  } catch (error) {
    store.dispatch(addLog({ 
      message: `✗ Bridge error: ${error.message}`, 
      type: 'error' 
    }));
    return { success: false, error: error.message };
  }
};

/* ============================================================
 * SSE CONNECTION (Server-Sent Events)
 * Real-time streaming from USRP bridge
 * ============================================================ */

/**
 * Connect to USRP Bridge SSE stream for real-time updates
 * Receives data, status, log, and error messages from bridge
 */
export const connectToBridge = () => {
  if (eventSource) {
    return;
  }
  
  store.dispatch(addLog({ 
    message: '📡 Connecting to USRP Bridge...', 
    type: 'info' 
  }));
  
  eventSource = new EventSource(`${BRIDGE_URL}/events`);
  
  eventSource.onopen = () => {
    store.dispatch(addLog({ 
      message: '✓ Connected to USRP Bridge', 
      type: 'success' 
    }));
  };
  
  eventSource.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case 'data':
          processUsrpData(message.payload, 'USRP (rx_ofdm.py)');
          break;
        case 'status':
          isRxRunning = message.payload.running;
          if (message.payload.running) {
            store.dispatch(addLog({ 
              message: '📡 rx_ofdm.py is running', 
              type: 'info' 
            }));
          }
          break;
        case 'log':
          console.log('[rx_ofdm]', message.payload);
          break;
        case 'error':
          store.dispatch(addLog({ 
            message: `[rx_ofdm] ${message.payload}`, 
            type: 'error' 
          }));
          break;
      }
    } catch (error) {
      console.error('[USRP] Error parsing SSE message:', error);
    }
  };
  
  eventSource.onerror = () => {
    store.dispatch(addLog({ 
      message: '✗ USRP Bridge connection lost', 
      type: 'warning' 
    }));
    disconnectFromBridge();
    
    // Auto-reconnect after delay
    reconnectTimeout = setTimeout(() => {
      store.dispatch(addLog({ 
        message: '🔄 Attempting to reconnect to USRP Bridge...', 
        type: 'info' 
      }));
      connectToBridge();
    }, USRP_CONFIG.SSE_RECONNECT_DELAY);
  };
};

/**
 * Disconnect from USRP Bridge SSE stream
 * Clears reconnect timeout and closes connection
 */
export const disconnectFromBridge = () => {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
};

/* ============================================================
 * USRP MODE MANAGEMENT
 * Switching between Socket and USRP data sources
 * ============================================================ */

/**
 * Enter USRP mode when socket connection fails
 * Starts LOOP MODE for continuous radio reception while offline
 *
 * @returns {Promise<Object>} Result with success flag
 */
export const startUsrpMode = async () => {
  store.dispatch(addLog({ 
    message: '📡 Entering USRP mode (socket offline)...', 
    type: 'info' 
  }));
  store.dispatch(setUsrpMode(true));
  
  // Check if bridge is available
  const status = await checkBridgeStatus();
  
  if (!status.available) {
    store.dispatch(addLog({ 
      message: '⚠️ USRP Bridge not running. Start it with: node usrp-bridge.js', 
      type: 'warning' 
    }));
    return { success: false, error: 'Bridge not available' };
  }
  
  // Connect to SSE stream
  connectToBridge();
  
  // Start rx_ofdm.py in LOOP MODE if not already running
  if (!status.rxRunning) {
    const result = await startRxLoop();
    return result;
  } else {
    store.dispatch(addLog({ 
      message: '📡 rx_ofdm.py already running', 
      type: 'info' 
    }));
    return { success: true, alreadyRunning: true };
  }
};

/**
 * Exit USRP mode when socket connection is restored
 * Stops rx_ofdm.py and disconnects from bridge
 */
export const stopUsrpMode = async () => {
  store.dispatch(addLog({ 
    message: '📡 Exiting USRP mode (socket online)...', 
    type: 'info' 
  }));
  
  // Stop rx_ofdm.py loop mode when socket reconnects
  await stopRxOfdm();
  
  disconnectFromBridge();
  store.dispatch(setUsrpMode(false));
  store.dispatch(setDataSource('socket'));
};

/* ============================================================
 * STATUS GETTERS
 * ============================================================ */

/**
 * Check if rx_ofdm.py is currently running
 * @returns {boolean} Running status
 */
export const isRxOfdmRunning = () => isRxRunning;

/**
 * Check if connected to bridge SSE stream
 * @returns {boolean} Connection status
 */
export const isBridgeConnected = () => {
  return eventSource !== null && eventSource.readyState === EventSource.OPEN;
};

/**
 * Fetch latest data from bridge (one-time request)
 * Useful for getting initial data without SSE stream
 *
 * @returns {Promise<Object>} Result with success flag and data
 */
export const fetchLatestData = async () => {
  try {
    const response = await fetch(`${BRIDGE_URL}/data`);
    if (response.ok) {
      const data = await response.json();
      processUsrpData(data, 'USRP (fetched)');
      return { success: true, data };
    }
    return { success: false, error: 'No data available' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/* ============================================================
 * SCREEN RELAY SOCKET
 * Internal relay for multi-screen synchronization over network
 * ============================================================ */

/**
 * Connect to bridge relay as controller (LandingPage)
 * Controller sends route data, receives screen connection events
 *
 * @param {Object} callbacks - Event callbacks
 * @param {Function} [callbacks.onScreenConnected] - Called when screen connects
 * @param {Function} [callbacks.onScreenDisconnected] - Called when screen disconnects
 * @returns {Object} Socket.IO client instance
 *
 * @example
 * connectAsController({
 *   onScreenConnected: (screenId) => console.log('Screen joined:', screenId),
 *   onScreenDisconnected: (screenId) => console.log('Screen left:', screenId)
 * });
 */
export const connectAsController = (callbacks = {}) => {
  if (relaySocket?.connected) {
    console.log('[Relay] Already connected as controller');
    return relaySocket;
  }
  
  relayCallbacks = { ...relayCallbacks, ...callbacks };
  
  relaySocket = socketIO(BRIDGE_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: USRP_CONFIG.RELAY_RECONNECT_DELAY
  });
  
  relaySocket.on('connect', () => {
    console.log('[Relay] Connected to bridge, registering as controller');
    relaySocket.emit('register_controller');
  });
  
  relaySocket.on('controller_registered', (data) => {
    console.log('[Relay] ✓ Registered as controller', data);
  });
  
  relaySocket.on('screen_connected', (data) => {
    console.log('[Relay] Screen connected:', data.screenId);
    if (relayCallbacks.onScreenConnected) {
      relayCallbacks.onScreenConnected(data.screenId);
    }
  });
  
  relaySocket.on('screen_disconnected', (data) => {
    console.log('[Relay] Screen disconnected:', data.screenId);
    if (relayCallbacks.onScreenDisconnected) {
      relayCallbacks.onScreenDisconnected(data.screenId);
    }
  });
  
  relaySocket.on('disconnect', () => {
    console.log('[Relay] Disconnected from bridge');
  });
  
  relaySocket.on('connect_error', (error) => {
    console.log('[Relay] Connection error:', error.message);
  });
  
  return relaySocket;
};

/**
 * Connect to bridge relay as screen client (ScreenPage)
 * Screens receive route data and connection status updates
 *
 * @param {string} screenId - Screen identifier from URL params
 * @param {Function} onRouteData - Callback when route data received
 * @param {Function} [onConnectionStatus] - Callback when controller status changes
 * @returns {Object} Socket.IO client instance
 *
 * @example
 * connectAsScreen('screen_1',
 *   (data) => setRoutes(data.routes),
 *   (connected, msg) => setControllerOnline(connected)
 * );
 */
export const connectAsScreen = (screenId, onRouteData, onConnectionStatus = null) => {
  if (relaySocket?.connected) {
    console.log('[Relay] Already connected');
    return relaySocket;
  }
  
  relaySocket = socketIO(BRIDGE_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: USRP_CONFIG.RELAY_RECONNECT_DELAY
  });
  
  relaySocket.on('connect', () => {
    console.log(`[Relay] Connected to bridge, registering as screen: ${screenId}`);
    relaySocket.emit('register_screen', { screenId });
  });
  
  relaySocket.on('route_data', (data) => {
    console.log('[Relay] Received route data');
    if (onRouteData) {
      onRouteData(data);
    }
  });
  
  relaySocket.on('connection_status', (data) => {
    console.log('[Relay] Received connection status:', data.connected ? 'CONNECTED' : 'DISCONNECTED');
    if (onConnectionStatus) {
      onConnectionStatus(data.connected, data.message);
    }
  });
  
  relaySocket.on('disconnect', () => {
    console.log('[Relay] Disconnected from bridge');
  });
  
  relaySocket.on('connect_error', (error) => {
    console.log('[Relay] Connection error (bridge may not be running):', error.message);
  });
  
  return relaySocket;
};

/**
 * Broadcast route data to all connected screens
 * Called by controller when new routes are received
 *
 * @param {Object} routeData - Route data to broadcast
 * @returns {boolean} True if sent, false if not connected
 */
export const broadcastToScreens = (routeData) => {
  if (!relaySocket?.connected) {
    console.log('[Relay] Not connected, cannot broadcast');
    return false;
  }
  
  relaySocket.emit('route_update', routeData);
  console.log('[Relay] Route update sent to bridge');
  return true;
};

/**
 * Broadcast connection status to all connected screens
 * Notifies screens when controller connects/disconnects from backend
 *
 * @param {boolean} connected - Whether controller is connected
 * @param {string} [message=''] - Optional status message
 * @returns {boolean} True if sent, false if not connected
 */
export const broadcastConnectionStatus = (connected, message = '') => {
  if (!relaySocket?.connected) {
    console.log('[Relay] Not connected, cannot broadcast status');
    return false;
  }
  
  relaySocket.emit('connection_status', { connected, message });
  console.log(`[Relay] Connection status broadcast: ${connected ? 'connected' : 'disconnected'}`);
  return true;
};

/**
 * Disconnect from relay socket
 * Should be called on component unmount
 */
export const disconnectRelay = () => {
  if (relaySocket) {
    relaySocket.disconnect();
    relaySocket = null;
    console.log('[Relay] Disconnected');
  }
};

/**
 * Check if relay socket is connected
 * @returns {boolean} Connection status
 */
export const isRelayConnected = () => relaySocket?.connected || false;

/**
 * Get the resolved bridge URL
 * @returns {string} Bridge URL
 * @deprecated Use getBridgeUrl from config module instead
 */
export { BRIDGE_URL as bridgeUrl };
