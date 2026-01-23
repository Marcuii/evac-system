#!/usr/bin/env node
/**
 * @fileoverview USRP Bridge Service
 * @description A lightweight Node.js service that bridges the React app to rx_ofdm.py
 * 
 * @author Marcelino Saad
 * @version 1.0.0
 * @license MIT
 * 
 * Features:
 * - Starts/stops rx_ofdm.py on demand
 * - Watches data_rx.json for changes
 * - Provides SSE stream for real-time updates
 * - Internal Socket.IO relay for screen tabs
 * - Runs on port 3062
 * 
 * Usage:
 *   node usrp-bridge.js
 * 
 * The React app communicates with this bridge when socket connection fails.
 * Screen tabs connect via Socket.IO to receive route data from the controller.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { Server as SocketIOServer } from 'socket.io';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3062;
const DATA_FILE = path.join(__dirname, 'data_rx.json');
const RX_SCRIPT = path.join(__dirname, 'rx_ofdm.py');

// USRP Environment Configuration (fixes pthread/snap issues on Linux)
const USRP_UHD_IMAGES_DIR = "/usr/share/uhd/images";
const USRP_LD_PRELOAD = "/usr/lib/x86_64-linux-gnu/libpthread.so.0";

// Detect Python command based on platform
const isWindows = process.platform === 'win32';
const PYTHON_CMD = isWindows ? 'python' : 'python3';

let rxProcess = null;
let sseClients = [];
let lastData = null;
let fileWatcher = null;
let autoRestartEnabled = false; // Auto-restart rx_ofdm.py in loop mode
const RESTART_DELAY = 2000; // Delay before restarting (ms)

// ═══════════════════════════════════════════════════════════════
// INTERNAL SOCKET RELAY - For screen tab synchronization
// ═══════════════════════════════════════════════════════════════
let io = null;
let controllerSocket = null;
let lastRouteData = null;
const screenSockets = new Map(); // screenId -> socket

/**
 * Parse USRP data from file (removes padding)
 */
function parseUsrpData(content) {
  try {
    const lines = content.split('\n');
    const jsonLines = lines.filter(line => !line.match(/^=+$/) && line.trim());
    const jsonStr = jsonLines.join('\n');
    if (!jsonStr) return null;
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('[Bridge] Parse error:', error.message);
    return null;
  }
}

/**
 * Read and parse data file
 */
function readDataFile() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf8');
      const data = parseUsrpData(content);
      if (data && JSON.stringify(data) !== JSON.stringify(lastData)) {
        lastData = data;
        broadcastToClients({ type: 'data', payload: data });
        console.log('[Bridge] New data received');
      }
      return data;
    }
  } catch (error) {
    console.error('[Bridge] Error reading data file:', error.message);
  }
  return null;
}

/**
 * Start watching data file
 */
function startFileWatcher() {
  if (fileWatcher) return;
  
  console.log('[Bridge] Watching:', DATA_FILE);
  
  // Use polling for reliability
  fileWatcher = setInterval(() => {
    readDataFile();
  }, 500); // Check every 500ms
  
  // Also watch for file changes (if supported)
  try {
    fs.watchFile(DATA_FILE, { interval: 500 }, (curr, prev) => {
      if (curr.mtime !== prev.mtime) {
        readDataFile();
      }
    });
  } catch (e) {
    // Ignore - polling fallback is active
  }
}

/**
 * Stop file watcher
 */
function stopFileWatcher() {
  if (fileWatcher) {
    clearInterval(fileWatcher);
    fileWatcher = null;
  }
  try {
    fs.unwatchFile(DATA_FILE);
  } catch (e) {
    // Ignore
  }
}

/**
 * Broadcast message to all SSE clients
 */
function broadcastToClients(message) {
  const data = `data: ${JSON.stringify(message)}\n\n`;
  sseClients = sseClients.filter(client => {
    try {
      client.write(data);
      return true;
    } catch (e) {
      return false;
    }
  });
}

/**
 * Start rx_ofdm.py process
 */
function startRxOfdm() {
  if (rxProcess) {
    return { success: false, error: 'Already running', pid: rxProcess.pid };
  }
  
  console.log('[Bridge] Starting rx_ofdm.py...');
  
  try {
    // Prepare environment for GNURadio/UHD
    const cleanEnv = { ...process.env };
    
    if (!isWindows) {
      // Linux-specific: Fix pthread/snap library issues
      delete cleanEnv.LD_LIBRARY_PATH;
      delete cleanEnv.PYTHONPATH;
      cleanEnv.UHD_IMAGES_DIR = USRP_UHD_IMAGES_DIR;
      cleanEnv.LD_PRELOAD = USRP_LD_PRELOAD;
    }
    cleanEnv.DISPLAY = process.env.DISPLAY || ':0';
    
    console.log(`[Bridge] Using Python command: ${PYTHON_CMD}`);
    
    // Platform-specific spawn configuration
    if (isWindows) {
      // Windows: Use shell with quoted path to handle spaces
      const cmd = `${PYTHON_CMD} "${RX_SCRIPT}"`;
      rxProcess = spawn(cmd, [], {
        cwd: path.dirname(RX_SCRIPT),
        env: cleanEnv,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true
      });
    } else {
      // Linux/macOS: Direct spawn without shell
      rxProcess = spawn(PYTHON_CMD, [RX_SCRIPT], {
        cwd: path.dirname(RX_SCRIPT),
        env: cleanEnv,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false
      });
    }
    
    rxProcess.stdout.on('data', (data) => {
      const msg = data.toString().trim();
      if (msg) {
        console.log('[rx_ofdm]', msg);
        broadcastToClients({ type: 'log', payload: msg });
      }
    });
    
    rxProcess.stderr.on('data', (data) => {
      const msg = data.toString().trim();
      if (msg) {
        console.error('[rx_ofdm ERROR]', msg);
        broadcastToClients({ type: 'error', payload: msg });
      }
    });
    
    rxProcess.on('close', (code) => {
      console.log(`[Bridge] rx_ofdm.py exited with code ${code}`);
      broadcastToClients({ type: 'status', payload: { running: false, exitCode: code } });
      rxProcess = null;
      
      // Auto-restart if loop mode is enabled and exit was successful
      if (autoRestartEnabled && code === 0) {
        console.log(`[Bridge] Auto-restarting rx_ofdm.py in ${RESTART_DELAY}ms...`);
        setTimeout(() => {
          if (autoRestartEnabled && !rxProcess) {
            startRxOfdm();
          }
        }, RESTART_DELAY);
      }
    });
    
    rxProcess.on('error', (err) => {
      console.error('[Bridge] Failed to start rx_ofdm.py:', err.message);
      broadcastToClients({ type: 'error', payload: err.message });
      rxProcess = null;
    });
    
    // Start file watcher
    startFileWatcher();
    
    broadcastToClients({ type: 'status', payload: { running: true, pid: rxProcess.pid } });
    
    return { success: true, pid: rxProcess.pid };
  } catch (error) {
    console.error('[Bridge] Error starting rx_ofdm.py:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Stop rx_ofdm.py process
 */
function stopRxOfdm() {
  // Disable auto-restart when manually stopping
  autoRestartEnabled = false;
  
  if (!rxProcess) {
    return { success: true, message: 'Not running' };
  }
  
  console.log('[Bridge] Stopping rx_ofdm.py...');
  
  try {
    rxProcess.kill('SIGTERM');
    
    // Force kill after 3 seconds
    setTimeout(() => {
      if (rxProcess) {
        rxProcess.kill('SIGKILL');
      }
    }, 3000);
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Start rx_ofdm.py in loop mode (auto-restart after each reception)
 */
function startRxLoop() {
  autoRestartEnabled = true;
  console.log('[Bridge] Loop mode ENABLED - rx_ofdm.py will auto-restart');
  
  if (!rxProcess) {
    return startRxOfdm();
  }
  
  return { success: true, message: 'Loop mode enabled, already running', pid: rxProcess.pid };
}

/**
 * Stop loop mode (stop auto-restart)
 */
function stopRxLoop() {
  autoRestartEnabled = false;
  console.log('[Bridge] Loop mode DISABLED');
  return { success: true, message: 'Loop mode disabled' };
}

/**
 * Get current status
 */
function getStatus() {
  return {
    available: true,
    rxRunning: rxProcess !== null,
    loopMode: autoRestartEnabled,
    pid: rxProcess?.pid || null,
    hasData: lastData !== null,
    dataFile: DATA_FILE,
    clients: sseClients.length
  };
}

/**
 * Handle CORS
 */
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

/**
 * HTTP Request Handler
 */
function handleRequest(req, res) {
  setCorsHeaders(res);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;
  
  console.log(`[Bridge] ${req.method} ${pathname}`);
  
  // GET /status - Get bridge status
  if (req.method === 'GET' && pathname === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getStatus()));
    return;
  }
  
  // POST /start - Start rx_ofdm.py
  if (req.method === 'POST' && pathname === '/start') {
    const result = startRxOfdm();
    res.writeHead(result.success ? 200 : 400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
    return;
  }
  
  // POST /stop - Stop rx_ofdm.py
  if (req.method === 'POST' && pathname === '/stop') {
    const result = stopRxOfdm();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
    return;
  }
  
  // POST /loop/start - Start rx_ofdm.py in loop mode (auto-restart)
  if (req.method === 'POST' && pathname === '/loop/start') {
    const result = startRxLoop();
    res.writeHead(result.success ? 200 : 400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
    return;
  }
  
  // POST /loop/stop - Stop loop mode (disable auto-restart)
  if (req.method === 'POST' && pathname === '/loop/stop') {
    const result = stopRxLoop();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
    return;
  }
  
  // GET /data - Get latest data
  if (req.method === 'GET' && pathname === '/data') {
    if (lastData) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(lastData));
    } else {
      // Try to read from file
      const data = readDataFile();
      if (data) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'No data available' }));
      }
    }
    return;
  }
  
  // GET /events - SSE stream
  if (req.method === 'GET' && pathname === '/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    
    // Send initial status
    res.write(`data: ${JSON.stringify({ type: 'status', payload: getStatus() })}\n\n`);
    
    // Add to clients
    sseClients.push(res);
    console.log(`[Bridge] SSE client connected (${sseClients.length} total)`);
    
    // Remove on close
    req.on('close', () => {
      sseClients = sseClients.filter(c => c !== res);
      console.log(`[Bridge] SSE client disconnected (${sseClients.length} total)`);
    });
    
    // Start file watcher if not already
    startFileWatcher();
    
    return;
  }
  
  // 404 for unknown routes
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
}

// Create and start server
const server = http.createServer(handleRequest);

// ═══════════════════════════════════════════════════════════════
// SOCKET.IO INTERNAL RELAY
// Controller (LandingPage) sends route data here,
// Screen tabs connect and receive their specific routes
// ═══════════════════════════════════════════════════════════════
io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log(`[Relay] Socket connected: ${socket.id}`);
  
  // Controller registers itself
  socket.on('register_controller', () => {
    controllerSocket = socket;
    console.log(`[Relay] ✓ Controller registered: ${socket.id}`);
    socket.emit('controller_registered', { 
      screens: Array.from(screenSockets.keys()),
      hasRouteData: lastRouteData !== null
    });
  });
  
  // Screen registers with its ID (from URL)
  socket.on('register_screen', (data) => {
    const { screenId } = data;
    if (!screenId) {
      socket.emit('error', { message: 'screenId required' });
      return;
    }
    
    screenSockets.set(screenId, socket);
    socket.screenId = screenId;
    console.log(`[Relay] ✓ Screen registered: ${screenId} (${screenSockets.size} screens)`);
    
    // Send current route data if available
    if (lastRouteData) {
      socket.emit('route_data', lastRouteData);
      console.log(`[Relay] Sent cached route to ${screenId}`);
    }
    
    // Notify controller of new screen
    if (controllerSocket) {
      controllerSocket.emit('screen_connected', { screenId });
    }
  });
  
  // Controller broadcasts route data
  socket.on('route_update', (routeData) => {
    if (socket !== controllerSocket) {
      console.log('[Relay] Ignoring route_update from non-controller');
      return;
    }
    
    lastRouteData = routeData;
    console.log(`[Relay] Broadcasting route to ${screenSockets.size} screens`);
    
    // Broadcast to all connected screens
    screenSockets.forEach((screenSocket, screenId) => {
      screenSocket.emit('route_data', routeData);
    });
  });
  
  // Controller broadcasts connection status (connected/disconnected from backend)
  socket.on('connection_status', (statusData) => {
    if (socket !== controllerSocket) {
      console.log('[Relay] Ignoring connection_status from non-controller');
      return;
    }
    
    const { connected, message } = statusData;
    console.log(`[Relay] Broadcasting connection status: ${connected ? 'CONNECTED' : 'DISCONNECTED'} to ${screenSockets.size} screens`);
    
    // Clear cached route data if disconnected
    if (!connected) {
      lastRouteData = null;
    }
    
    // Broadcast to all connected screens
    screenSockets.forEach((screenSocket, screenId) => {
      screenSocket.emit('connection_status', { connected, message });
    });
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    if (socket === controllerSocket) {
      controllerSocket = null;
      console.log('[Relay] ✗ Controller disconnected');
    } else if (socket.screenId) {
      screenSockets.delete(socket.screenId);
      console.log(`[Relay] ✗ Screen disconnected: ${socket.screenId} (${screenSockets.size} screens)`);
      if (controllerSocket) {
        controllerSocket.emit('screen_disconnected', { screenId: socket.screenId });
      }
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║          USRP Bridge Service Started                  ║');
  console.log('╠═══════════════════════════════════════════════════════╣');
  console.log(`║  Port:       ${PORT}                                     ║`);
  console.log(`║  Platform:   ${isWindows ? 'Windows' : 'Linux/macOS'}                              ║`);
  console.log('╠═══════════════════════════════════════════════════════╣');
  console.log('║  HTTP Endpoints:                                      ║');
  console.log('║    GET  /status      - Bridge status                  ║');
  console.log('║    POST /start       - Start rx_ofdm.py (once)        ║');
  console.log('║    POST /stop        - Stop rx_ofdm.py                ║');
  console.log('║    POST /loop/start  - Start in loop mode             ║');
  console.log('║    POST /loop/stop   - Stop loop mode                 ║');
  console.log('║    GET  /data        - Get latest data                ║');
  console.log('║    GET  /events      - SSE stream                     ║');
  console.log('╠═══════════════════════════════════════════════════════╣');
  console.log('║  Socket.IO Relay (for screen tabs):                   ║');
  console.log('║    register_controller - LandingPage registers        ║');
  console.log('║    register_screen     - ScreenPage registers         ║');
  console.log('║    route_update        - Controller sends routes      ║');
  console.log('║    route_data          - Screens receive routes       ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log('');
  
  // Start file watcher immediately
  startFileWatcher();
});

// Cleanup on exit
process.on('SIGINT', () => {
  console.log('\n[Bridge] Shutting down...');
  autoRestartEnabled = false;
  stopRxOfdm();
  stopFileWatcher();
  process.exit(0);
});

process.on('SIGTERM', () => {
  autoRestartEnabled = false;
  stopRxOfdm();
  stopFileWatcher();
  process.exit(0);
});
