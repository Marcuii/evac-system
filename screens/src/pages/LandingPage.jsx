/**
 * @fileoverview Landing Page - Controller Dashboard
 * @description Main controller page for the EES application. Manages connections
 *              to the backend server, handles USRP radio fallback, and relays
 *              evacuation routes to connected screen windows.
 *
 * @module pages/LandingPage
 * @author Marcelino Saad
 * @version 1.0.0
 *
 * @description
 * Responsibilities:
 * ┌─────────────────────────────────────────────────────────────┐
 * │  Server Connection  : WebSocket to backend for live routes  │
 * │  USRP Fallback     : Radio-based routes when server offline │
 * │  Screen Relay      : Broadcasts routes to screen windows    │
 * │  Floor Management  : Fetches and manages floor data         │
 * │  Status Monitoring : Server, bridge, and connection health  │
 * └─────────────────────────────────────────────────────────────┘
 *
 * Connection Flow:
 * 1. User enters server URL and admin token
 * 2. Fetch floor data from backend
 * 3. Connect WebSocket for live route updates
 * 4. On disconnect: Auto-reconnect or USRP fallback
 * 5. Relay received routes to all open screen windows
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  Radio, 
  Monitor, 
  RefreshCw, 
  Zap, 
  MapPin,
  AlertTriangle,
  CheckCircle,
  Play,
  Square,
  Wifi,
  WifiOff,
  Server,
  Layers,
  Cast,
  Key,
  LogIn,
  LogOut,
  Image,
  Navigation,
  ExternalLink
} from 'lucide-react';
import { Card, Button } from '../components/ui';
import { 
  setServerUrl, 
  setFloorId, 
  setAdminToken, 
  setFloorData,
  setInitialized 
} from '../store/slices/configSlice';
import { setRouteUpdate } from '../store/slices/routeSlice';
import { 
  setConnected, 
  setDisconnected,
  setUsrpMode, 
  setDataSource,
  setConnectionError 
} from '../store/slices/connectionSlice';
import { addLog, clearLogs } from '../store/slices/logSlice';
import { 
  checkBridgeStatus, 
  startRxLoop, 
  startRxOfdm,
  stopRxOfdm,
  connectAsController,
  broadcastToScreens,
  broadcastConnectionStatus,
  disconnectRelay,
} from '../services/usrpService';
import { 
  initBroadcast, 
  broadcastRouteData,
  broadcastMessage,
  onDataRequest,
  isBroadcastSupported 
} from '../services/broadcastService';
import { 
  fetchFloorData, 
  checkServerHealth 
} from '../services/floorService';
import { io } from 'socket.io-client';
import { CONNECTION_CONFIG } from '../config';

/* ============================================================
 * CONSTANTS (from config)
 * ============================================================ */

const { 
  MAX_RECONNECT_ATTEMPTS, 
  RECONNECT_DELAY, 
  SERVER_CHECK_INTERVAL, 
  BRIDGE_CHECK_INTERVAL 
} = CONNECTION_CONFIG;

export function LandingPage() {
  const dispatch = useDispatch();
  const { serverUrl, floorId, adminToken, floorData, isInitialized } = useSelector(state => state.config);
  const { isConnected, usrpMode, dataSource } = useSelector(state => state.connection);
  const routeData = useSelector(state => state.route);
  const logs = useSelector(state => state.log.entries);
  
  // Local form state
  const [localServerUrl, setLocalServerUrl] = useState(serverUrl || 'http://localhost:3000');
  const [localFloorId, setLocalFloorId] = useState(floorId || '');
  const [localAdminToken, setLocalAdminToken] = useState(adminToken || '');
  
  // Connection state
  const [socket, setSocket] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [serverOnline, setServerOnline] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const reconnectTimerRef = useRef(null);
  
  // USRP state
  const [bridgeStatus, setBridgeStatus] = useState({ 
    available: false, 
    rxRunning: false, 
    loopMode: false 
  });
  const [checkingBridge, setCheckingBridge] = useState(false);
  const [eventSource, setEventSource] = useState(null);
  
  // UI state
  const [lastUpdate, setLastUpdate] = useState(null);
  const [openScreens, setOpenScreens] = useState(new Set());
  const [initStep, setInitStep] = useState(0); // 0: config, 1: fetching, 2: connecting, 3: ready
  const [testOfflineMode, setTestOfflineMode] = useState(false); // Manual offline testing mode
  const testOfflineModeRef = useRef(false); // Ref to avoid stale closure in disconnect handler
  const intentionalDisconnectRef = useRef(false); // Track if user clicked disconnect
  const [usrpAutoStarted, setUsrpAutoStarted] = useState(false); // Track if USRP was auto-started
  const usrpAutoStartedRef = useRef(false); // Ref to avoid stale closure in heartbeat
  const heartbeatIntervalRef = useRef(null); // For continuous heartbeat
  const socketRef = useRef(null); // Ref for socket to use in heartbeat
  const heartbeatAttemptCountRef = useRef(0); // Ref for attempt counter to persist across calls

  // ============================================================
  // DOCUMENT TITLE
  // ============================================================

  useEffect(() => {
    if (floorData?.name) {
      document.title = `${floorData.name} Monitor - Emergency Evacuation`;
    } else {
      document.title = 'Emergency Evacuation Monitor';
    }
  }, [floorData?.name]);

  // ============================================================
  // INITIALIZATION & BROADCAST
  // ============================================================

  // Refs to access latest data in callbacks without causing reconnects
  const routeDataRef = useRef(routeData);
  const floorDataRef = useRef(floorData);
  const localFloorIdRef = useRef(localFloorId);
  
  // Keep refs updated
  useEffect(() => {
    routeDataRef.current = routeData;
    floorDataRef.current = floorData;
    localFloorIdRef.current = localFloorId;
  }, [routeData, floorData, localFloorId]);

  // Connect to relay once on mount (no dependencies that change)
  useEffect(() => {
    // Initialize same-device broadcast channel
    initBroadcast();
    
    // Connect to bridge relay as controller (for network screens)
    connectAsController({
      onScreenConnected: (screenId) => {
        dispatch(addLog({ message: `📺 Screen connected: ${screenId}`, type: 'info' }));
        // Send current route data with floorData to the newly connected screen
        const currentRouteData = routeDataRef.current;
        const currentFloorData = floorDataRef.current;
        const currentFloorId = localFloorIdRef.current;
        
        if (currentRouteData?.routes?.length > 0) {
          const dataWithFloor = {
            ...currentRouteData,
            floorId: currentFloorId,
            floorData: currentFloorData
          };
          broadcastToScreens(dataWithFloor);
        }
      },
      onScreenDisconnected: (screenId) => {
        dispatch(addLog({ message: `📺 Screen disconnected: ${screenId}`, type: 'warning' }));
      }
    });
    
    const unsubscribe = onDataRequest(() => {
      const currentRouteData = routeDataRef.current;
      const currentFloorData = floorDataRef.current;
      const currentFloorId = localFloorIdRef.current;
      
      if (currentRouteData?.routes?.length > 0) {
        const dataWithFloor = {
          ...currentRouteData,
          floorId: currentFloorId,
          floorData: currentFloorData
        };
        broadcastRouteData(dataWithFloor);
        broadcastToScreens(dataWithFloor);
      }
    });
    
    return () => {
      unsubscribe();
      disconnectRelay();
    };
  }, [dispatch]); // Only dispatch - stable reference

  // ============================================================
  // SERVER HEALTH CHECK
  // ============================================================

  const checkServer = useCallback(async () => {
    const health = await checkServerHealth(localServerUrl);
    setServerOnline(health.online);
    return health.online;
  }, [localServerUrl]);

  useEffect(() => {
    checkServer();
    const interval = setInterval(checkServer, SERVER_CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, [checkServer]);

  // ============================================================
  // USRP BRIDGE CHECK
  // ============================================================

  const checkBridge = useCallback(async () => {
    setCheckingBridge(true);
    const status = await checkBridgeStatus();
    setBridgeStatus({
      available: status.available,
      rxRunning: status.rxRunning || false,
      loopMode: status.loopMode || false
    });
    setCheckingBridge(false);
    return status.available;
  }, []);

  useEffect(() => {
    checkBridge();
    const interval = setInterval(checkBridge, BRIDGE_CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, [checkBridge]);

  // ============================================================
  // USRP SSE CONNECTION
  // ============================================================

  useEffect(() => {
    if (bridgeStatus.available && !eventSource && usrpMode) {
      const es = new EventSource('http://localhost:3062/events');
      
      es.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'data') {
            handleRouteData(message.payload, 'usrp');
          } else if (message.type === 'status') {
            setBridgeStatus(prev => ({
              ...prev,
              rxRunning: message.payload.running,
              loopMode: message.payload.loopMode
            }));
          }
        } catch (error) {
          console.error('SSE parse error:', error);
        }
      };
      
      es.onerror = () => {
        es.close();
        setEventSource(null);
      };
      
      setEventSource(es);
    }
    
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [bridgeStatus.available, usrpMode]);

  // ============================================================
  // ROUTE DATA HANDLER
  // ============================================================

  const handleRouteData = useCallback((data, source) => {
    dispatch(setRouteUpdate({ ...data, source }));
    dispatch(setDataSource(source));
    dispatch(addLog({ message: `📡 Route update via ${source}`, type: 'success' }));
    setLastUpdate(new Date());
    
    // Prepare route data with floor info for screens
    const routeDataForScreens = { 
      ...data, 
      source, 
      floorId: localFloorId,
      floorData: floorData  // Include floor map data for screens
    };
    
    // Broadcast to screen windows on same device (BroadcastChannel)
    broadcastRouteData(routeDataForScreens);
    
    // Broadcast to screen tabs via internal relay socket (for network screens)
    broadcastToScreens(routeDataForScreens);
  }, [dispatch, localFloorId, floorData]);

  // ============================================================
  // USRP FALLBACK LOGIC
  // ============================================================

  const startUsrpFallback = useCallback(async () => {
    dispatch(addLog({ message: '📡 Starting USRP fallback mode...', type: 'info' }));
    dispatch(setUsrpMode(true));
    
    const bridgeAvailable = await checkBridge();
    if (bridgeAvailable) {
      await startRxLoop();
      dispatch(addLog({ message: '✓ USRP loop receiver started', type: 'success' }));
    } else {
      dispatch(addLog({ message: '⚠️ USRP Bridge not available - start with: node usrp-bridge.js', type: 'warning' }));
    }
  }, [dispatch, checkBridge]);

  const stopUsrpFallback = useCallback(async () => {
    dispatch(addLog({ message: '📡 Stopping USRP fallback...', type: 'info' }));
    await stopRxOfdm();
    dispatch(setUsrpMode(false));
    dispatch(setDataSource('socket'));
    await checkBridge();
  }, [dispatch, checkBridge]);

  // ============================================================
  // HEARTBEAT RECONNECTION LOGIC
  // ============================================================

  const startHeartbeatReconnection = useCallback(() => {
    // DON'T start if heartbeat is already running
    if (heartbeatIntervalRef.current) {
      return;
    }

    dispatch(addLog({ message: '🔄 Starting heartbeat reconnection...', type: 'info' }));
    
    const heartbeatAttempt = () => {
      // Increment attempt counter using ref
      heartbeatAttemptCountRef.current++;
      const attemptCount = heartbeatAttemptCountRef.current;
      setReconnectAttempts(attemptCount);
      
      // Use ref to get current socket (not stale closure value)
      const currentSocket = socketRef.current;
      
      // Auto-start USRP after 5 failed attempts (use ref for current value)
      if (attemptCount === MAX_RECONNECT_ATTEMPTS && !usrpAutoStartedRef.current) {
        dispatch(addLog({ 
          message: `🔄 ${MAX_RECONNECT_ATTEMPTS} attempts failed - auto-starting USRP fallback`, 
          type: 'warning' 
        }));
        startUsrpFallback();
        usrpAutoStartedRef.current = true;
        setUsrpAutoStarted(true);
      }
      
      dispatch(addLog({ 
        message: `💓 Heartbeat ${attemptCount} - trying to reconnect...`, 
        type: 'info' 
      }));

      // Attempt to reconnect using current socket ref
      if (currentSocket) {
        dispatch(addLog({ 
          message: `🔍 Socket status: connected=${currentSocket.connected}, id=${currentSocket.id || 'none'}`, 
          type: 'info' 
        }));
        
        if (!currentSocket.connected) {
          currentSocket.connect();
        }
      } else {
        dispatch(addLog({ message: '⚠️ No socket reference in heartbeat', type: 'warning' }));
      }
    };

    // Start immediate attempt, then every RECONNECT_DELAY
    heartbeatAttempt();
    heartbeatIntervalRef.current = setInterval(heartbeatAttempt, RECONNECT_DELAY);
  }, [dispatch, startUsrpFallback]); // Removed socket and usrpAutoStarted - using refs instead

  // ============================================================
  // SOCKET CONNECTION
  // ============================================================

  const connectSocket = useCallback(() => {
    // Disconnect and clear old socket
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const newSocket = io(localServerUrl, {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnection: false, // We handle reconnection manually
    });

    // Set ref IMMEDIATELY so heartbeat can access it
    socketRef.current = newSocket;

    newSocket.on('connect', () => {
      dispatch(setConnected());
      dispatch(addLog({ message: `✓ Socket connected`, type: 'success' }));
      setConnecting(false);
      setReconnectAttempts(0);
      setInitStep(3);

      // Notify all screens that connection is active
      broadcastConnectionStatus(true, 'Controller connected to backend');
      
      // Also notify same-device screens via BroadcastChannel
      broadcastMessage('connection_status', {
        connected: true,
        message: 'Controller connected to backend'
      });

      // Stop heartbeat if running and reset attempt counter
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
        heartbeatAttemptCountRef.current = 0; // Reset counter on successful connection
        dispatch(addLog({ message: '✓ Heartbeat stopped - connected', type: 'success' }));
      }

      // Stop USRP if it was auto-started (check ref for current value)
      if (usrpAutoStartedRef.current) {
        dispatch(addLog({ message: '✓ Stopping auto-started USRP - socket restored', type: 'success' }));
        usrpAutoStartedRef.current = false;
        setUsrpAutoStarted(false);
        stopUsrpFallback();
      }

      // Register floor
      newSocket.emit('register_floor', { floorId: localFloorId });
      dispatch(addLog({ message: `📡 Registering floor: ${localFloorId}`, type: 'info' }));
    });

    newSocket.on('registration_confirmed', (data) => {
      dispatch(addLog({ 
        message: `✓ Registered: ${data.floorName}`, 
        type: 'success' 
      }));
      if (data.startPoints?.length) {
        dispatch(addLog({ 
          message: `📺 Screens: ${data.startPoints.join(', ')}`, 
          type: 'info' 
        }));
      }
      dispatch(setInitialized(true));
    });

    newSocket.on('registration_error', (data) => {
      dispatch(addLog({ message: `✗ Registration failed: ${data.error}`, type: 'error' }));
      dispatch(setConnectionError(data.error));
    });

    newSocket.on('disconnect', (reason) => {
      dispatch(setDisconnected());
      dispatch(addLog({ message: `✗ Disconnected: ${reason}`, type: 'warning' }));
      
      // Clear any existing reconnect timer
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }

      // Skip reconnection if user intentionally disconnected
      if (intentionalDisconnectRef.current) {
        dispatch(addLog({ message: '🔌 Manual disconnect - auto-reconnect disabled', type: 'info' }));
        return;
      }

      // Skip reconnection if in test offline mode
      if (testOfflineModeRef.current) {
        dispatch(addLog({ message: '🧪 TEST MODE: Auto-reconnect disabled', type: 'info' }));
        return;
      }

      // Start heartbeat reconnection
      startHeartbeatReconnection();
    });

    newSocket.on('connect_error', (error) => {
      dispatch(addLog({ message: `Connection error: ${error.message}`, type: 'error' }));
      setConnecting(false);
      
      if (!isConnected && !testOfflineModeRef.current) {
        startHeartbeatReconnection();
      }
    });

    // Route events
    newSocket.on('floor-routes', (data) => handleRouteData(data, 'socket'));
    newSocket.on('route_update', (data) => {
      if (!localFloorId || data.floorId === localFloorId) {
        handleRouteData(data, 'socket');
      }
    });

    // Set state (ref already set above)
    setSocket(newSocket);
  }, [localServerUrl, localFloorId, dispatch, handleRouteData, startHeartbeatReconnection]);

  // ============================================================
  // MAIN INITIALIZATION FLOW
  // ============================================================

  const handleInitialize = async () => {
    // Reset intentional disconnect flag when user wants to connect
    intentionalDisconnectRef.current = false;
    
    // Validate inputs
    if (!localServerUrl || !localFloorId || !localAdminToken) {
      dispatch(addLog({ message: '✗ Please fill all fields', type: 'error' }));
      return;
    }

    dispatch(clearLogs());
    setConnecting(true);
    setInitStep(1);

    // Save config
    dispatch(setServerUrl(localServerUrl));
    dispatch(setFloorId(localFloorId));
    dispatch(setAdminToken(localAdminToken));

    // Step 1: Check server health
    dispatch(addLog({ message: '🔍 Checking server...', type: 'info' }));
    const isOnline = await checkServer();
    
    if (!isOnline) {
      dispatch(addLog({ message: '✗ Server offline - starting USRP fallback', type: 'error' }));
      setConnecting(false);
      setInitStep(0);
      dispatch(setInitialized(true)); // Allow screen access even in USRP-only mode
      startUsrpFallback();
      return;
    }

    // Step 2: Fetch floor data
    dispatch(addLog({ message: '📥 Fetching floor data...', type: 'info' }));
    const floorResult = await fetchFloorData(localServerUrl, localFloorId, localAdminToken);
    
    if (!floorResult.success) {
      dispatch(addLog({ message: `✗ ${floorResult.error}`, type: 'error' }));
      setConnecting(false);
      setInitStep(0);
      return;
    }

    dispatch(setFloorData(floorResult.data));
    dispatch(addLog({ 
      message: `✓ Floor loaded: ${floorResult.data.name} (${floorResult.data.nodes?.length || 0} nodes)`, 
      type: 'success' 
    }));

    // Step 3: Connect socket
    setInitStep(2);
    dispatch(addLog({ message: '🔌 Connecting socket...', type: 'info' }));
    
    connectSocket();
  };

  // ============================================================
  // DISCONNECT
  // ============================================================

  const handleDisconnect = async () => {
    dispatch(addLog({ message: '🔌 Disconnecting...', type: 'info' }));
    
    // Set flag FIRST to prevent auto-reconnect when socket.disconnect() fires 'disconnect' event
    intentionalDisconnectRef.current = true;
    
    // Notify all screens that connection is stopping (BEFORE disconnecting)
    // This keeps relay socket alive for future auto-reconnect
    broadcastConnectionStatus(false, 'Controller disconnected from backend');
    
    // Also notify same-device screens via BroadcastChannel
    broadcastMessage('connection_status', {
      connected: false,
      message: 'Controller disconnected from backend'
    });
    
    // Clear reconnect timer and heartbeat
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    
    // Stop socket
    if (socket) {
      socket.disconnect();
      socketRef.current = null;
      setSocket(null);
    }
    
    // Stop USRP event source
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
    }
    
    // Always stop USRP loop (regardless of usrpMode state)
    await stopRxOfdm();
    await checkBridge();
    
    // Reset ALL state to allow reconnection
    dispatch(setDisconnected());
    dispatch(setUsrpMode(false));
    dispatch(setInitialized(false));
    dispatch(setFloorData(null));
    setConnecting(false);  // Allow form to be editable again
    setInitStep(0);
    setReconnectAttempts(0);
    usrpAutoStartedRef.current = false; // Reset ref too
    setUsrpAutoStarted(false); // Reset auto-started flag
    
    dispatch(addLog({ message: '✓ Disconnected - Ready to reconnect', type: 'success' }));
  };

  // ============================================================
  // SCREEN MANAGEMENT
  // ============================================================

  // Get screen nodes from floor data (supports multiple formats)
  // Priority: activeStartPoints (virtual) > screens array > legacy startPoints > route data
  const getScreenNodeIds = () => {
    if (floorData?.activeStartPoints?.length) {
      return floorData.activeStartPoints;
    }
    if (floorData?.screens?.length) {
      return floorData.screens.filter(s => s.status === 'active').map(s => s.nodeId);
    }
    if (floorData?.startPoints?.length) {
      return floorData.startPoints;
    }
    // Fallback to route data if no floor config
    if (routeData.routes?.length) {
      return [...new Set(routeData.routes.map(r => r.startNode))];
    }
    return [];
  };

  const screenNodes = getScreenNodeIds().map(id => {
    const node = floorData?.nodes?.find(n => n.id === id);
    return node || { id };
  });

  // Get exit nodes with labels
  const exitNodes = (floorData?.exitPoints || []).map(id => {
    const node = floorData?.nodes?.find(n => n.id === id);
    return node || { id };
  });

  // Get camera stats
  const totalCameras = floorData?.cameras?.length || 0;
  const activeCameras = floorData?.cameras?.filter(c => c.status === 'active')?.length || 0;

  // Get screen stats (from screens array or screenNodes)
  const totalScreens = floorData?.screens?.length || screenNodes.length;
  const activeScreens = floorData?.screens?.filter(s => s.status === 'active')?.length || screenNodes.length;

  // Helper to get node label
  const getNodeLabel = (nodeId) => {
    const node = floorData?.nodes?.find(n => n.id === nodeId);
    return node?.label || nodeId;
  };

  // Helper to get exit label
  const getExitLabel = (exitId) => {
    const exit = exitNodes.find(n => n.id === exitId);
    return exit?.label || exitId;
  };

  const openScreen = (screenId) => {
    const screenRoute = routeData.routes?.find(r => r.startNode === screenId);
    if (screenRoute || floorData) {
      localStorage.setItem(`screen_${screenId}`, JSON.stringify({
        route: screenRoute,
        floorId: localFloorId,
        floorData: floorData,
        timestamp: routeData.timestamp || new Date().toISOString()
      }));
    }
    window.open(`/screen/${screenId}`, `screen_${screenId}`);
    setOpenScreens(prev => new Set([...prev, screenId]));
  };

  const openAllScreens = () => {
    screenNodes.forEach((node, i) => {
      setTimeout(() => openScreen(node.id), i * 300);
    });
    dispatch(addLog({ message: `📺 Opening ${screenNodes.length} screens...`, type: 'info' }));
  };

  // ============================================================
  // CLEANUP
  // ============================================================

  useEffect(() => {
    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (socket) {
        socket.disconnect();
      }
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center justify-center gap-3">
            <Monitor className="w-10 h-10 text-blue-400" />
            Emergency Evacuation Screens
          </h1>
          <p className="text-blue-200">Floor Controller - One laptop per floor with USRP</p>
          {isBroadcastSupported() && (
            <p className="text-green-400 text-sm mt-1">✓ Local screen sync enabled</p>
          )}
        </div>

        {/* Status Bar */}
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <StatusBadge icon={Server} label="Server" active={serverOnline} />
          <StatusBadge icon={Wifi} label="Socket" active={isConnected} />
          <StatusBadge icon={Radio} label="USRP" active={bridgeStatus.available} warning={usrpMode} />
          <StatusBadge icon={Layers} label="Floor" active={!!floorData} text={floorData?.name} />
        </div>

        {/* Initialization Card - Show when not initialized */}
        {!isInitialized && (
          <Card className="p-6 bg-slate-800/80 border-slate-700">
            <div className="flex items-center gap-3 mb-6">
              <LogIn className="w-6 h-6 text-blue-400" />
              <h2 className="text-xl font-bold text-white">Initialize Floor Controller</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  <Server className="w-4 h-4 inline mr-1" />
                  Server URL
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  placeholder="http://localhost:3000"
                  value={localServerUrl}
                  onChange={(e) => setLocalServerUrl(e.target.value)}
                  disabled={connecting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  <Layers className="w-4 h-4 inline mr-1" />
                  Floor ID
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  placeholder="floor_1"
                  value={localFloorId}
                  onChange={(e) => setLocalFloorId(e.target.value)}
                  disabled={connecting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  <Key className="w-4 h-4 inline mr-1" />
                  Admin Token
                </label>
                <input
                  type="password"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  placeholder="your-admin-token"
                  value={localAdminToken}
                  onChange={(e) => setLocalAdminToken(e.target.value)}
                  disabled={connecting}
                />
              </div>
            </div>

            {/* Progress Steps */}
            {connecting && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <StepIndicator step={1} current={initStep} label="Fetch Floor" />
                  <div className="flex-1 h-0.5 bg-slate-600 mx-2" />
                  <StepIndicator step={2} current={initStep} label="Connect Socket" />
                  <div className="flex-1 h-0.5 bg-slate-600 mx-2" />
                  <StepIndicator step={3} current={initStep} label="Ready" />
                </div>
              </div>
            )}

            <Button
              variant="primary"
              className="w-full flex items-center justify-center gap-2"
              onClick={handleInitialize}
              disabled={connecting || !localServerUrl || !localFloorId || !localAdminToken}
            >
              {connecting ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Initializing...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  Initialize
                </>
              )}
            </Button>
          </Card>
        )}

        {/* Active Session Card - Show when initialized */}
        {isInitialized && (
          <>
            {/* Floor Info */}
            <Card className="p-6 bg-slate-800/80 border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Image className="w-6 h-6 text-green-400" />
                  <div>
                    <h2 className="text-xl font-bold text-white">{floorData?.name || localFloorId}</h2>
                    <p className="text-slate-400 text-sm">
                      {floorData ? `${floorData.nodes?.length || 0} nodes • ${floorData.edges?.length || 0} edges • ${activeScreens}/${totalScreens} screens • ${activeCameras}/${totalCameras} cameras` : 'USRP-only mode'}
                    </p>
                  </div>
                </div>
                <Button
                  variant="danger"
                  size="small"
                  onClick={handleDisconnect}
                  className="flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Disconnect
                </Button>
              </div>

              {/* Connection Status */}
              <div className="flex items-center gap-4 flex-wrap">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
                  isConnected ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
                }`}>
                  {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                  <span className="text-sm font-medium">
                    {isConnected ? 'Socket Connected' : 
                     heartbeatIntervalRef.current ? `Heartbeat (${reconnectAttempts})` :
                     reconnectAttempts > 0 ? `Reconnecting (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})` : 'Disconnected'}
                  </span>
                </div>

                {usrpMode && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-900/50 text-purple-300">
                    <Radio className="w-4 h-4 animate-pulse" />
                    <span className="text-sm font-medium">USRP Fallback Active</span>
                  </div>
                )}

                {lastUpdate && (
                  <div className="text-slate-400 text-sm">
                    Last update: {lastUpdate.toLocaleTimeString()}
                  </div>
                )}
              </div>
            </Card>

            {/* Emergency Alert */}
            {routeData.emergency && (
              <Card className="p-4 bg-red-900/50 border-red-600 animate-pulse">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-8 h-8 text-red-400" />
                  <div>
                    <p className="text-red-200 font-bold text-lg">EMERGENCY ACTIVE</p>
                    <p className="text-red-300 text-sm">Hazard Level: {routeData.overallHazardLevel}</p>
                  </div>
                </div>
              </Card>
            )}

            {/* Screens Grid */}
            <Card className="p-6 bg-slate-800/80 border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Monitor className="w-6 h-6 text-blue-400" />
                  <h2 className="text-xl font-bold text-white">Screens ({screenNodes.length})</h2>
                </div>
                {screenNodes.length > 0 && (
                  <Button
                    variant="primary"
                    size="small"
                    onClick={openAllScreens}
                    className="flex items-center gap-2"
                  >
                    <Cast className="w-4 h-4" />
                    Open All
                  </Button>
                )}
              </div>

              {screenNodes.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Monitor className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No screens configured</p>
                  <p className="text-sm">Waiting for route data...</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {screenNodes.map(node => {
                    const route = routeData.routes?.find(r => r.startNode === node.id);
                    const isOpen = openScreens.has(node.id);
                    
                    return (
                      <button
                        key={node.id}
                        onClick={() => openScreen(node.id)}
                        className={`p-4 rounded-lg border transition-all text-left ${
                          isOpen 
                            ? 'bg-green-900/30 border-green-500 ring-2 ring-green-500/30' 
                            : 'bg-slate-700/50 border-slate-600 hover:border-blue-500 hover:bg-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Monitor className={`w-5 h-5 ${isOpen ? 'text-green-400' : 'text-blue-400'}`} />
                            <span className="font-bold text-white">{node.label || node.id}</span>
                          </div>
                          <ExternalLink className="w-4 h-4 text-slate-400" />
                        </div>
                        {node.label && node.label !== node.id && (
                          <p className="text-xs text-slate-500 mb-1 font-mono">{node.id}</p>
                        )}
                        {route && (
                          <div className="flex items-center gap-1 text-xs text-slate-300">
                            <Navigation className="w-3 h-3" />
                            <span>→ {getExitLabel(route.exitNode)}</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* USRP Controls */}
            <Card className="p-6 bg-slate-800/80 border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Radio className="w-6 h-6 text-purple-400" />
                  <h2 className="text-xl font-bold text-white">USRP Bridge</h2>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    bridgeStatus.available ? 'bg-green-600' : 'bg-red-600'
                  } text-white`}>
                    {bridgeStatus.available ? 'Online' : 'Offline'}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="small"
                  onClick={checkBridge}
                  disabled={checkingBridge}
                  className="text-white"
                >
                  <RefreshCw className={`w-5 h-5 ${checkingBridge ? 'animate-spin' : ''}`} />
                </Button>
              </div>

              {bridgeStatus.available ? (
                <div className="space-y-3">
                  {/* Main USRP Controls */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Start Loop Button */}
                    <Button
                      variant={bridgeStatus.rxRunning && bridgeStatus.loopMode ? 'danger' : 'primary'}
                      size="small"
                      onClick={async () => {
                        if (bridgeStatus.rxRunning) {
                          await stopRxOfdm();
                          dispatch(setUsrpMode(false));
                        } else {
                          await startRxLoop();
                          dispatch(setUsrpMode(true));
                        }
                        checkBridge();
                      }}
                      className="flex items-center gap-2"
                    >
                      {bridgeStatus.rxRunning && bridgeStatus.loopMode ? (
                        <>
                          <Square className="w-4 h-4" />
                          Stop Loop
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          Start Loop
                        </>
                      )}
                    </Button>

                    {/* Start Once Button */}
                    <Button
                      variant="outline"
                      size="small"
                      onClick={async () => {
                        await startRxOfdm();
                        dispatch(setUsrpMode(true));
                        checkBridge();
                      }}
                      disabled={bridgeStatus.rxRunning}
                      className="flex items-center gap-2 text-purple-400 border-purple-500 hover:bg-purple-900/30"
                    >
                      <Zap className="w-4 h-4" />
                      Start Once
                    </Button>

                    {/* Stop Button (only when running) */}
                    {bridgeStatus.rxRunning && (
                      <Button
                        variant="danger"
                        size="small"
                        onClick={async () => {
                          await stopRxOfdm();
                          dispatch(setUsrpMode(false));
                          checkBridge();
                        }}
                        className="flex items-center gap-2"
                      >
                        <Square className="w-4 h-4" />
                        Stop
                      </Button>
                    )}

                    {bridgeStatus.rxRunning && (
                      <span className="text-green-400 text-sm flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        {bridgeStatus.loopMode ? 'Loop Running...' : 'Receiving...'}
                      </span>
                    )}
                  </div>

                  {/* Test Offline Button */}
                  <div className="pt-2 border-t border-slate-700">
                    <p className="text-xs text-slate-400 mb-2">Testing: Simulate socket disconnect to test USRP fallback</p>
                    <Button
                      variant={testOfflineMode ? 'primary' : 'outline'}
                      size="small"
                      onClick={() => {
                        if (testOfflineMode) {
                          // Go back online
                          dispatch(addLog({ message: '🔄 TEST: Reconnecting socket...', type: 'info' }));
                          testOfflineModeRef.current = false;
                          setTestOfflineMode(false);
                          setReconnectAttempts(0);
                          if (socket) {
                            socket.connect();
                          }
                        } else {
                          // Go offline
                          dispatch(addLog({ message: '🧪 TEST: Simulating socket disconnect...', type: 'warning' }));
                          if (socket) {
                            testOfflineModeRef.current = true;
                            setTestOfflineMode(true);
                            socket.disconnect();
                            dispatch(setDisconnected());
                            dispatch(addLog({ message: '❌ Socket disconnected - USRP should take over if loop is running', type: 'info' }));
                          } else {
                            dispatch(addLog({ message: '⚠️ No socket to disconnect', type: 'warning' }));
                          }
                        }
                      }}
                      disabled={!socket}
                      className={`flex items-center gap-2 ${
                        testOfflineMode 
                          ? 'bg-green-600 hover:bg-green-700 text-white' 
                          : 'text-yellow-400 border-yellow-600 hover:bg-yellow-900/30'
                      }`}
                    >
                      {testOfflineMode ? (
                        <>
                          <Wifi className="w-4 h-4" />
                          Go Online
                        </>
                      ) : (
                        <>
                          <WifiOff className="w-4 h-4" />
                          Test Offline
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-yellow-900/30 border border-yellow-600 rounded-lg text-yellow-200 text-sm">
                  ⚠️ Start USRP Bridge: <code className="bg-slate-800 px-2 py-0.5 rounded ml-1">node usrp-bridge.js</code>
                </div>
              )}
            </Card>
          </>
        )}

        {/* Logs */}
        <Card className="p-4 bg-slate-800/80 border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-300">System Logs</h3>
            <Button
              variant="ghost"
              size="small"
              onClick={() => dispatch(clearLogs())}
              className="text-slate-400 text-xs"
            >
              Clear
            </Button>
          </div>
          <div className="h-32 overflow-y-auto font-mono text-xs space-y-1 bg-slate-900/50 rounded p-2">
            {logs.slice(-20).map((log, i) => (
              <div key={i} className={`${
                log.type === 'error' ? 'text-red-400' :
                log.type === 'warning' ? 'text-yellow-400' :
                log.type === 'success' ? 'text-green-400' :
                'text-slate-300'
              }`}>
                <span className="text-slate-500">{log.timestamp}</span>
                {' '}{log.message}
              </div>
            ))}
            {logs.length === 0 && (
              <div className="text-slate-500">No logs yet</div>
            )}
          </div>
        </Card>

      </div>
    </div>
  );
}

/* ============================================================
 * HELPER COMPONENTS
 * ============================================================ */

/**
 * StatusBadge - Displays connection/service status with icon
 * @param {Object} props - Component props
 * @param {React.ComponentType} props.icon - Lucide icon component
 * @param {string} props.label - Default label text
 * @param {boolean} props.active - Whether the service is active
 * @param {boolean} [props.warning] - Whether to show warning state
 * @param {string} [props.text] - Override text (uses label if not provided)
 * @returns {JSX.Element} Styled badge with icon and status indicator
 */
function StatusBadge({ icon: Icon, label, active, warning, text }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
      warning ? 'bg-yellow-900/50 text-yellow-300' :
      active ? 'bg-green-900/50 text-green-300' : 'bg-slate-700 text-slate-400'
    }`}>
      <Icon className="w-4 h-4" />
      <span>{text || label}</span>
      <div className={`w-2 h-2 rounded-full ${
        warning ? 'bg-yellow-400 animate-pulse' :
        active ? 'bg-green-400' : 'bg-slate-500'
      }`} />
    </div>
  );
}

/**
 * StepIndicator - Shows progress step in initialization flow
 * @param {Object} props - Component props
 * @param {number} props.step - The step number (1-based)
 * @param {number} props.current - Current active step
 * @param {string} props.label - Step label text
 * @returns {JSX.Element} Circular step indicator with label
 * 
 * @example
 * // Step 1 is complete, step 2 is active
 * <StepIndicator step={1} current={2} label="Fetch Floor" />
 */
function StepIndicator({ step, current, label }) {
  const isComplete = current > step;
  const isActive = current === step;
  
  return (
    <div className="flex flex-col items-center">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
        isComplete ? 'bg-green-500 text-white' :
        isActive ? 'bg-blue-500 text-white animate-pulse' :
        'bg-slate-600 text-slate-400'
      }`}>
        {isComplete ? <CheckCircle className="w-5 h-5" /> : step}
      </div>
      <span className="text-xs text-slate-400 mt-1">{label}</span>
    </div>
  );
}

export default LandingPage;
