/**
 * @fileoverview Screen Page - Individual Evacuation Display
 * @description Displays evacuation route for a specific screen location. Receives
 *              route updates via BroadcastChannel (same device) or Socket relay
 *              (network devices) from the controller LandingPage.
 *
 * @module pages/ScreenPage
 * @author Marcelino Saad
 * @version 1.0.0
 *
 * @description
 * Layout Structure:
 * ┌───────────────────────────────────────────────────────────┐
 * │ Header: Close btn | Live indicator | Screen ID           │
 * ├───────────────────────────────────────────────────────────┤
 * │ Controller Disconnected Banner (conditional)             │
 * ├───────────────────────────────────────────────────────────┤
 * │ Emergency Banner (conditional - red pulsing)             │
 * ├──────────────────────┬────────────────────────────────────┤
 * │ Floor Map            │ Route Information                  │
 * │ (Interactive SVG)    │ - Exit direction                   │
 * │                      │ - Distance                         │
 * │                      │ - Hazard level                     │
 * │                      │ - Step-by-step path                │
 * │                      │ - Quick info cards                 │
 * └──────────────────────┴────────────────────────────────────┘
 *
 * Data Sources:
 * 1. BroadcastChannel - For screens on same device as controller
 * 2. Socket Relay     - For screens on network devices
 * 3. localStorage     - Backup/persistence for page refresh
 */

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Radio, 
  MapPin, 
  Navigation, 
  AlertTriangle,
  ArrowRight,
  Clock,
  Layers,
  Cast,
  Map,
  WifiOff
} from 'lucide-react';
import { Card, Button } from '../components/ui';
import FloorMapVisualization from '../components/FloorMapVisualization';
import { 
  initBroadcast, 
  onRouteUpdate, 
  onConnectionStatus,
  requestCurrentData 
} from '../services/broadcastService';
import {
  connectAsScreen,
  disconnectRelay
} from '../services/usrpService';

/* ============================================================
 * SCREEN PAGE COMPONENT
 * ============================================================ */

export function ScreenPage() {
  const { screenId } = useParams();
  
  /* ----------------------------------------------------------
   * State Management
   * ---------------------------------------------------------- */
  const [screenData, setScreenData] = useState(null);
  const [floorData, setFloorData] = useState(null);
  const [lastBroadcast, setLastBroadcast] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [connectionSource, setConnectionSource] = useState(null); // 'broadcast' | 'relay'
  const [controllerConnected, setControllerConnected] = useState(true); // Controller backend connection status

  /* ----------------------------------------------------------
   * Route Data Processing
   * Normalizes route data from any source (broadcast/relay)
   * ---------------------------------------------------------- */
  
  /**
   * Process incoming route data from any source
   * @param {Object} routeData - Route update payload
   * @param {string} source - Source identifier ('broadcast' | 'relay')
   */
  const processRouteData = (routeData, source) => {
    console.log(`[Screen] Received ${source} update:`, routeData);
    
    // Find this screen's route from the broadcast data
    const myRoute = routeData.routes?.find(r => r.startNode === screenId);
    
    // Update screen data
    const newScreenData = {
      route: myRoute,
      floorId: routeData.floorId,
      floorName: routeData.floorName,
      emergencyType: routeData.emergency ? 'EMERGENCY' : null,
      emergencyLocation: routeData.emergencyLocation,
      overallHazardLevel: routeData.overallHazardLevel,
      timestamp: routeData.timestamp
    };
    
    setScreenData(newScreenData);
    setLastBroadcast(new Date());
    setIsLive(true);
    setConnectionSource(source);
    
    // Update floor data if provided
    if (routeData.floorData) {
      setFloorData(routeData.floorData);
    }
    
    // Store for persistence (get current floorData to avoid stale closure)
    setFloorData(currentFloorData => {
      const floorDataToStore = routeData.floorData || currentFloorData;
      localStorage.setItem(`screen_${screenId}`, JSON.stringify({
        ...newScreenData,
        floorData: floorDataToStore
      }));
      return floorDataToStore || currentFloorData;
    });
  };

  /* ----------------------------------------------------------
   * Initialization & Subscription Effect
   * Sets up broadcast/relay listeners based on device location
   * ---------------------------------------------------------- */
  useEffect(() => {
    if (screenId) {
      // Set initial title (will be updated when floorData loads with label)
      document.title = `${screenId} Screen - Emergency Evacuation`;
      
      // Determine if we're on the same device as the controller
      // Same device = localhost or 127.0.0.1
      const isSameDevice = window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1';
      
      console.log(`[Screen] Mode: ${isSameDevice ? 'LOCAL (BroadcastChannel)' : 'NETWORK (Socket relay)'}`);
      
      // Load stored route data for this screen (initial/backup)
      const storedData = localStorage.getItem(`screen_${screenId}`);
      if (storedData) {
        try {
          const parsed = JSON.parse(storedData);
          setScreenData(parsed);
          if (parsed.floorData) {
            setFloorData(parsed.floorData);
          }
        } catch (error) {
          console.error('Failed to parse screen data:', error);
        }
      }
      
      let unsubscribeBroadcast = () => {};
      let unsubscribeConnectionStatus = () => {};
      
      // Handler for connection status updates
      const handleConnectionStatus = (connected, message) => {
        console.log(`[Screen] Controller ${connected ? 'connected' : 'disconnected'}: ${message}`);
        setControllerConnected(connected);
        if (connected) {
          setIsLive(true);
        }
      };
      
      if (isSameDevice) {
        // SAME DEVICE: Use BroadcastChannel only (faster, no network hop)
        initBroadcast();
        
        unsubscribeBroadcast = onRouteUpdate((routeData, timestamp) => {
          processRouteData(routeData, 'broadcast');
        });
        
        // Listen for connection status via BroadcastChannel
        unsubscribeConnectionStatus = onConnectionStatus(handleConnectionStatus);
        
        // Request current data from controller
        requestCurrentData();
      } else {
        // NETWORK DEVICE: Use socket relay only
        connectAsScreen(
          screenId, 
          (routeData) => processRouteData(routeData, 'relay'),
          handleConnectionStatus
        );
      }
      
      // Listen for storage changes (cross-tab sync backup)
      const handleStorageChange = (e) => {
        if (e.key === `screen_${screenId}` && e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue);
            setScreenData(parsed);
            if (parsed.floorData) {
              setFloorData(parsed.floorData);
            }
          } catch (error) {
            console.error('Failed to parse updated screen data:', error);
          }
        }
      };
      
      window.addEventListener('storage', handleStorageChange);
      
      return () => {
        unsubscribeBroadcast();
        unsubscribeConnectionStatus();
        if (!isSameDevice) {
          disconnectRelay();
        }
        window.removeEventListener('storage', handleStorageChange);
        document.title = 'Emergency Evacuation';
      };
    }
  }, [screenId]);

  const route = screenData?.route;
  const hasEmergency = screenData?.emergencyType || screenData?.overallHazardLevel === 'critical' || route?.hazardLevel === 'critical';

  /* ----------------------------------------------------------
   * Helper Functions
   * ---------------------------------------------------------- */

  /**
   * Get node display label from floor data
   * @param {string} nodeId - Node identifier
   * @returns {string} Human-readable label or nodeId if not found
   */
  const getNodeLabel = (nodeId) => {
    const node = floorData?.nodes?.find(n => n.id === nodeId);
    return node?.label || nodeId;
  };

  // Get the screen's label
  const screenLabel = getNodeLabel(screenId);

  // Update document title when we have the label
  useEffect(() => {
    if (screenId) {
      document.title = `${screenLabel} Screen - Emergency Evacuation`;
    }
  }, [screenId, screenLabel]);

  /**
   * Calculate maximum hazard level between route and overall
   * @returns {string|null} Highest hazard level or null if none
   */
  const getMaxHazardLevel = () => {
    const hazardPriority = { critical: 4, high: 3, moderate: 2, low: 1, none: 0 };
    const routeLevel = route?.hazardLevel?.toLowerCase() || 'none';
    const overallLevel = screenData?.overallHazardLevel?.toLowerCase() || 'none';
    
    const routePriority = hazardPriority[routeLevel] || 0;
    const overallPriority = hazardPriority[overallLevel] || 0;
    
    if (routePriority >= overallPriority) {
      return routeLevel !== 'none' ? route?.hazardLevel : null;
    }
    return overallLevel !== 'none' ? screenData?.overallHazardLevel : null;
  };

  const maxHazardLevel = getMaxHazardLevel();

  /**
   * Get Tailwind CSS classes for hazard level badge
   * @param {string} level - Hazard level (critical|high|moderate|low)
   * @returns {string} Tailwind class string
   */
  const getHazardColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'critical': return 'bg-red-600 text-white';
      case 'high': return 'bg-orange-600 text-white';
      case 'moderate': return 'bg-yellow-600 text-black';
      case 'low': return 'bg-green-600 text-white';
      default: return 'bg-slate-600 text-white';
    }
  };

  /* ----------------------------------------------------------
   * Render
   * ---------------------------------------------------------- */

  return (
    <div className={`min-h-screen ${hasEmergency ? 'bg-gradient-to-br from-red-900 via-red-800 to-orange-900' : 'bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900'} p-4`}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="outline"
            size="small"
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            onClick={() => window.close()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Close
          </Button>
          
          <div className="flex items-center gap-4 text-white">
            {/* Controller Connection Status */}
            {!controllerConnected && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/30 text-red-300 animate-pulse">
                <WifiOff className="w-4 h-4" />
                <span className="text-xs font-medium">DISCONNECTED</span>
              </div>
            )}
            
            {/* Live Broadcast Indicator */}
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
              isLive && controllerConnected ? 'bg-green-500/20 text-green-300' : 'bg-slate-500/20 text-slate-400'
            }`}>
              <Cast className={`w-4 h-4 ${isLive && controllerConnected ? 'animate-pulse' : ''}`} />
              <span className="text-xs font-medium">
                {!controllerConnected 
                  ? 'Waiting'
                  : isLive 
                    ? connectionSource === 'relay' ? 'NETWORK' : 'LOCAL'
                    : 'Waiting'}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Radio className="w-5 h-5 text-blue-300" />
              <div className="text-right">
                <span className="text-sm font-bold block">{screenLabel}</span>
                {screenLabel !== screenId && (
                  <span className="text-xs text-slate-400 font-mono">{screenId}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Controller Disconnected Banner */}
        {!controllerConnected && (
          <Card className="p-4 mb-4 bg-yellow-600/80 border-yellow-500">
            <div className="flex items-center gap-3">
              <WifiOff className="w-8 h-8 text-white animate-pulse" />
              <div>
                <p className="text-white font-bold text-xl">
                  Controller Disconnected
                </p>
                <p className="text-yellow-100 text-sm">
                  The controller has disconnected from the backend. Displaying last known route. 
                  Will auto-reconnect when connection is restored.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Emergency Banner */}
        {hasEmergency && (
          <Card className="p-4 mb-4 bg-red-600/80 border-red-500 animate-pulse">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-white" />
              <div>
                <p className="text-white font-bold text-2xl">
                  ⚠️ {screenData?.emergencyType?.toUpperCase() || 'EMERGENCY'}
                </p>
                {screenData?.emergencyLocation && (
                  <p className="text-red-100">
                    Location: {screenData.emergencyLocation}
                  </p>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Main Content - Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          {/* Left: Floor Map Visualization */}
          <Card className="p-4 bg-slate-800/90 border-slate-700">
            <div className="flex items-center gap-2 mb-3">
              <Map className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-bold text-white">
                {floorData?.name || screenData?.floorId || 'Floor Map'}
              </h2>
            </div>
            
            <FloorMapVisualization
              floorData={floorData}
              currentScreenId={screenId}
              route={route}
              hasEmergency={hasEmergency}
            />
            
            {/* Last Update */}
            {lastBroadcast && (
              <div className="text-center mt-2">
                <span className="text-xs text-slate-400">
                  Updated: {lastBroadcast.toLocaleTimeString()}
                </span>
              </div>
            )}
          </Card>

          {/* Right: Route Information */}
          <div className="space-y-4">
            {route ? (
              <>
                {/* Main Direction Display */}
                <Card className="p-6 bg-slate-800/90 border-slate-700 text-center">
                  <Navigation className={`w-16 h-16 mx-auto mb-3 ${hasEmergency ? 'text-red-400' : 'text-green-400'} animate-bounce`} />
                  
                  <h1 className="text-4xl font-bold text-white mb-2">
                    EXIT → {getNodeLabel(route.exitNode)}
                  </h1>
                  
                  <p className="text-lg text-slate-300">
                    Follow the highlighted path
                  </p>
                  
                  {/* Distance in meters */}
                  {(route.distanceMeters || route.distance) && (
                    <p className="text-blue-400 mt-2 text-xl font-semibold">
                      {route.distanceMeters 
                        ? `${route.distanceMeters} meters` 
                        : `${typeof route.distance === 'number' ? route.distance.toFixed(1) : route.distance} units`}
                    </p>
                  )}

                  {/* Hazard Level Badge */}
                  {maxHazardLevel && (
                    <div className="mt-3">
                      <span className={`px-4 py-1.5 rounded-full text-sm font-bold uppercase ${getHazardColor(maxHazardLevel)}`}>
                        {maxHazardLevel} Hazard
                      </span>
                    </div>
                  )}
                </Card>

                {/* Route Path Steps */}
                <Card className="p-4 bg-slate-800/90 border-slate-700">
                  <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-red-400" />
                    Route Steps
                  </h3>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    {route.path?.map((nodeId, index) => (
                      <div key={index} className="flex items-center gap-1">
                        <span className={`px-3 py-1.5 rounded-lg text-sm font-bold ${
                          index === 0 
                            ? 'bg-blue-600 text-white' 
                            : index === route.path.length - 1 
                              ? 'bg-green-600 text-white'
                              : 'bg-slate-700 text-slate-200'
                        }`}>
                          {getNodeLabel(nodeId)}
                        </span>
                        {index < route.path.length - 1 && (
                          <ArrowRight className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Quick Info Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <Card className="p-3 bg-slate-800/90 border-slate-700">
                    <div className="flex items-center gap-2 text-slate-300 mb-1">
                      <MapPin className="w-4 h-4" />
                      <span className="text-xs">You Are Here</span>
                    </div>
                    <p className="text-xl font-bold text-blue-400">{getNodeLabel(route.startNode)}</p>
                  </Card>
                  
                  <Card className="p-3 bg-slate-800/90 border-slate-700">
                    <div className="flex items-center gap-2 text-slate-300 mb-1">
                      <Navigation className="w-4 h-4" />
                      <span className="text-xs">Go To Exit</span>
                    </div>
                    <p className="text-xl font-bold text-green-400">{getNodeLabel(route.exitNode)}</p>
                  </Card>
                </div>
              </>
            ) : (
              /* No Route - Show waiting state with map still visible */
              <Card className="p-8 bg-slate-800/90 border-slate-700 text-center">
                <Radio className="w-12 h-12 text-slate-500 mx-auto mb-4 animate-pulse" />
                <h3 className="text-xl font-medium text-white mb-2">Waiting for Route</h3>
                <p className="text-slate-400 text-sm">
                  {floorData 
                    ? 'Map loaded. Waiting for evacuation route data...' 
                    : 'Connecting to controller...'}
                </p>
                <p className="text-slate-500 text-xs mt-4">
                  Ensure: 1) USRP Bridge is running (node usrp-bridge.js)<br/>
                  2) LandingPage is open on the controlling laptop<br/>
                  3) Backend is connected and sending routes
                </p>
              </Card>
            )}
          </div>
        </div>

        {/* Bottom Info Bar */}
        <div className="mt-4 flex items-center justify-center gap-6 text-xs text-slate-500">
          {screenData?.floorId && (
            <span className="flex items-center gap-1">
              <Layers className="w-3 h-3" />
              Floor: {screenData.floorId}
            </span>
          )}
          {screenData?.timestamp && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(screenData.timestamp).toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default ScreenPage;
