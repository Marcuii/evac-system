/**
 * @fileoverview Floor Map Visualization Component
 * @description Interactive SVG-based floor map displaying nodes, edges,
 *              evacuation routes, and hazard information. Supports fullscreen
 *              mode and responsive scaling.
 *
 * @module components/FloorMapVisualization
 * @author Marcelino Saad
 * @version 1.0.0
 *
 * @description
 * Visual Elements:
 * ┌─────────────────────────────────────────────────────────────┐
 * │  Nodes     : Rooms, halls, exits (circles with colors)      │
 * │  Edges     : Connections between nodes (lines)              │
 * │  Route Path: Animated path from start to exit               │
 * │  Hazards   : Red dashed lines for dangerous edges           │
 * │  Legend    : Color key for visual elements                  │
 * └─────────────────────────────────────────────────────────────┘
 *
 * Node Colors:
 * - Blue  : Current screen location (pulsing)
 * - Green : Exit nodes
 * - Amber : Nodes on evacuation path
 * - Purple: Entrance nodes
 * - Gray  : Regular room nodes
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, Maximize2, Minimize2 } from 'lucide-react';

/* ============================================================
 * MAIN COMPONENT
 * ============================================================ */

/**
 * Floor Map Visualization Component
 * Renders an interactive SVG floor plan with evacuation routes
 *
 * @param {Object} props - Component props
 * @param {Object} props.floorData - Floor configuration data
 * @param {Array} props.floorData.nodes - Array of node objects with x, y coordinates
 * @param {Array} props.floorData.edges - Array of edge connections
 * @param {Array} [props.floorData.exitPoints] - Exit node IDs
 * @param {Object} [props.floorData.mapImage] - Background image URL
 * @param {string} props.currentScreenId - ID of current screen for highlighting
 * @param {Object} [props.route] - Current evacuation route
 * @param {Array} props.route.path - Array of node IDs in route
 * @param {boolean} props.hasEmergency - Whether emergency mode is active
 * @returns {JSX.Element} Floor map visualization
 *
 * @example
 * <FloorMapVisualization
 *   floorData={floorData}
 *   currentScreenId="N1"
 *   route={currentRoute}
 *   hasEmergency={true}
 * />
 */
export function FloorMapVisualization({ floorData, currentScreenId, route, hasEmergency }) {
  const containerRef = useRef(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 600, height: 400 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  /* ----------------------------------------
   * FULLSCREEN HANDLING
   * ---------------------------------------- */

  /**
   * Toggle fullscreen mode for the map container
   */
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('[FloorMap] Fullscreen error:', err);
    }
  }, []);

  // Listen for fullscreen state changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  /* ----------------------------------------
   * COORDINATE TRANSFORMATION
   * ---------------------------------------- */

  const mapImageUrl = floorData?.mapImage?.url || floorData?.mapImage?.localUrl;

  /**
   * Calculate bounding box from node coordinates
   * Adds padding for visual margin
   * @returns {Object} Bounds with minX, maxX, minY, maxY
   */
  const getNodeBounds = () => {
    if (!floorData?.nodes?.length) {
      return { minX: 0, maxX: 600, minY: 0, maxY: 400 };
    }
    
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    floorData.nodes.forEach(node => {
      if (node.x < minX) minX = node.x;
      if (node.x > maxX) maxX = node.x;
      if (node.y < minY) minY = node.y;
      if (node.y > maxY) maxY = node.y;
    });
    
    // Add 10% padding
    const paddingX = (maxX - minX) * 0.1 || 50;
    const paddingY = (maxY - minY) * 0.1 || 50;
    
    return { 
      minX: minX - paddingX, 
      maxX: maxX + paddingX, 
      minY: minY - paddingY, 
      maxY: maxY + paddingY 
    };
  };

  const bounds = getNodeBounds();
  const boundsWidth = bounds.maxX - bounds.minX || 600;
  const boundsHeight = bounds.maxY - bounds.minY || 400;

  // Update container size on resize
  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateSize = () => {
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width > 0) {
        setContainerSize({ 
          width: rect.width, 
          height: rect.height || 400 
        });
      }
    };
    
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Calculate scale factor for fitting nodes in container
  const scale = Math.min(
    (containerSize.width - 40) / boundsWidth, 
    (containerSize.height - 40) / boundsHeight, 
    2
  );

  /**
   * Transform X coordinate from floor space to SVG space
   * @param {number} x - Floor X coordinate
   * @returns {number} SVG X coordinate
   */
  const transformX = (x) => (x - bounds.minX) * scale + 20;

  /**
   * Transform Y coordinate from floor space to SVG space
   * @param {number} y - Floor Y coordinate
   * @returns {number} SVG Y coordinate
   */
  const transformY = (y) => (y - bounds.minY) * scale + 20;

  /* ----------------------------------------
   * NODE STYLING
   * ---------------------------------------- */

  /**
   * Get styling for a node based on its type and route status
   * @param {Object} node - Node object
   * @returns {Object} Style object with fill, stroke, pulse, size
   */
  const getNodeColor = (node) => {
    // Current screen - blue with pulse
    if (node.id === currentScreenId) {
      return { fill: '#3b82f6', stroke: '#1d4ed8', pulse: true, size: 14 };
    }
    
    // Exit nodes - green
    if (node.type === 'exit' || floorData?.exitPoints?.includes(node.id)) {
      return { fill: '#22c55e', stroke: '#15803d', pulse: false, size: 12 };
    }
    
    // Nodes on current route
    if (route?.path?.includes(node.id)) {
      // Start of route - blue pulse
      if (route.path[0] === node.id) {
        return { fill: '#3b82f6', stroke: '#1d4ed8', pulse: true, size: 14 };
      }
      // End of route (exit) - green pulse
      if (route.path[route.path.length - 1] === node.id) {
        return { fill: '#22c55e', stroke: '#15803d', pulse: true, size: 14 };
      }
      // Middle of route - amber
      return { fill: '#f59e0b', stroke: '#d97706', pulse: false, size: 10 };
    }
    
    // Entrance nodes - purple
    if (node.type === 'entrance') {
      return { fill: '#8b5cf6', stroke: '#6d28d9', pulse: false, size: 10 };
    }
    
    // Room nodes - gray
    if (node.type === 'room') {
      return { fill: '#64748b', stroke: '#475569', pulse: false, size: 8 };
    }
    
    // Default - light gray
    return { fill: '#94a3b8', stroke: '#64748b', pulse: false, size: 6 };
  };

  /* ----------------------------------------
   * HAZARD DETECTION
   * ---------------------------------------- */

  /**
   * Check if an edge has hazardous conditions
   * @param {Object} edge - Edge object
   * @returns {boolean} True if edge is hazardous
   */
  const hasHazard = (edge) => {
    // Check route hazardDetails first (real-time data)
    if (route?.hazardDetails) {
      const hazardInfo = route.hazardDetails.find(h => h.edgeId === edge.id);
      if (hazardInfo) {
        return hazardInfo.fire > 0.3 || hazardInfo.smoke > 0.3 || hazardInfo.people > 10;
      }
    }
    // Fallback to edge's stored values
    return (
      edge?.currentFireProb > 0.3 || 
      edge?.currentSmokeProb > 0.3 || 
      edge?.currentPeopleCount > (edge?.peopleThreshold || 10)
    );
  };

  /* ----------------------------------------
   * ROUTE PATH BUILDING
   * ---------------------------------------- */

  /**
   * Build SVG path data from route
   * @returns {Object|null} Path data with pathD string and points array
   */
  const buildRoutePath = () => {
    if (!route?.path || route.path.length < 2 || !floorData?.nodes) {
      return null;
    }
    
    const points = route.path.map(nodeId => {
      const node = floorData.nodes.find(n => n.id === nodeId);
      return node ? { x: transformX(node.x), y: transformY(node.y), id: nodeId } : null;
    }).filter(Boolean);
    
    if (points.length < 2) return null;
    
    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    return { pathD, points };
  };

  const routePath = buildRoutePath();
  const svgWidth = boundsWidth * scale + 40;
  const svgHeight = boundsHeight * scale + 40;

  // Debug logging
  console.log('[FloorMap] Data:', floorData?.name, 'nodes:', floorData?.nodes?.length, 'image:', mapImageUrl ? 'yes' : 'no');

  /* ----------------------------------------
   * EMPTY STATE RENDERS
   * ---------------------------------------- */

  if (!floorData) {
    return (
      <div className="flex items-center justify-center h-64 bg-slate-800/50 rounded-lg border border-slate-700">
        <p className="text-slate-400">No floor data available</p>
      </div>
    );
  }

  if (!floorData.nodes?.length) {
    return (
      <div className="flex items-center justify-center h-64 bg-slate-800/50 rounded-lg border border-slate-700">
        <div className="text-center">
          <MapPin className="w-12 h-12 text-slate-500 mx-auto mb-2" />
          <p className="text-slate-400">No nodes in floor data</p>
          <p className="text-slate-500 text-xs mt-1">Floor: {floorData.name || floorData.id}</p>
        </div>
      </div>
    );
  }

  /* ----------------------------------------
   * MAIN RENDER
   * ---------------------------------------- */

  return (
    <div 
      ref={containerRef} 
      className={`relative w-full rounded-lg border border-slate-700 overflow-hidden ${
        isFullscreen ? 'bg-slate-900' : 'bg-slate-900/50'
      }`} 
      style={{ minHeight: isFullscreen ? '100vh' : '300px', height: isFullscreen ? '100vh' : '400px' }}
    >
      {/* Fullscreen Toggle Button */}
      <button
        onClick={toggleFullscreen}
        className="absolute top-2 right-2 z-20 p-2 bg-slate-800/90 hover:bg-slate-700 rounded-lg border border-slate-600 transition-colors group"
        title={isFullscreen ? 'Exit Fullscreen (ESC)' : 'Fullscreen'}
      >
        {isFullscreen ? (
          <Minimize2 className="w-5 h-5 text-slate-300 group-hover:text-white" />
        ) : (
          <Maximize2 className="w-5 h-5 text-slate-300 group-hover:text-white" />
        )}
      </button>

      {/* Background Image (if available) */}
      {mapImageUrl && !imageError && (
        <img
          src={mapImageUrl}
          alt="Floor Map"
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
          className="absolute inset-0 w-full h-full object-contain opacity-40"
          style={{ display: imageLoaded ? 'block' : 'none' }}
        />
      )}

      {/* SVG Overlay */}
      <svg 
        className="absolute inset-0 w-full h-full" 
        viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Edge Lines */}
        {floorData.edges?.map(edge => {
          const fromNode = floorData.nodes.find(n => n.id === edge.from);
          const toNode = floorData.nodes.find(n => n.id === edge.to);
          if (!fromNode || !toNode) return null;
          
          const isOnRoute = route?.path?.includes(edge.from) && route?.path?.includes(edge.to);
          const isHaz = hasHazard(edge);
          
          return (
            <line 
              key={edge.id} 
              x1={transformX(fromNode.x)} 
              y1={transformY(fromNode.y)} 
              x2={transformX(toNode.x)} 
              y2={transformY(toNode.y)}
              stroke={isHaz ? '#ef4444' : '#475569'} 
              strokeWidth={isOnRoute ? 3 : 1.5} 
              strokeOpacity={isOnRoute ? 0.8 : 0.4}
              strokeDasharray={isHaz ? '5,5' : 'none'} 
            />
          );
        })}

        {/* Route Path Highlight */}
        {routePath && (
          <>
            {/* Glow effect */}
            <path 
              d={routePath.pathD} 
              fill="none" 
              stroke={hasEmergency ? '#ef4444' : '#22c55e'} 
              strokeWidth={8} 
              strokeOpacity={0.3} 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />
            {/* Main path */}
            <path 
              d={routePath.pathD} 
              fill="none" 
              stroke={hasEmergency ? '#f87171' : '#4ade80'} 
              strokeWidth={4} 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="animate-pulse" 
            />
            {/* Animated dashes */}
            <path 
              d={routePath.pathD} 
              fill="none" 
              stroke="white" 
              strokeWidth={2} 
              strokeDasharray="10,15" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              style={{ animation: 'dash 1s linear infinite' }} 
            />
          </>
        )}

        {/* Direction Arrows */}
        {routePath?.points?.slice(0, -1).map((point, i) => {
          const next = routePath.points[i + 1];
          const midX = (point.x + next.x) / 2;
          const midY = (point.y + next.y) / 2;
          const angle = Math.atan2(next.y - point.y, next.x - point.x) * 180 / Math.PI;
          return (
            <g key={`arrow-${i}`} transform={`translate(${midX}, ${midY}) rotate(${angle})`}>
              <polygon 
                points="0,-5 10,0 0,5" 
                fill={hasEmergency ? '#f87171' : '#4ade80'} 
                className="animate-pulse" 
              />
            </g>
          );
        })}

        {/* Node Circles */}
        {floorData.nodes.map(node => {
          const { fill, stroke, pulse, size } = getNodeColor(node);
          const x = transformX(node.x);
          const y = transformY(node.y);
          const showLabel = (
            node.id === currentScreenId || 
            floorData.exitPoints?.includes(node.id) || 
            route?.path?.includes(node.id) || 
            node.type === 'exit' || 
            node.type === 'entrance'
          );
          
          return (
            <g key={node.id}>
              {/* Pulse ring for important nodes */}
              {pulse && (
                <circle 
                  cx={x} 
                  cy={y} 
                  r={size + 6} 
                  fill={fill} 
                  opacity={0.3} 
                  className="animate-ping" 
                />
              )}
              {/* Node circle */}
              <circle 
                cx={x} 
                cy={y} 
                r={size} 
                fill={fill} 
                stroke={stroke} 
                strokeWidth={2} 
                className={pulse ? 'animate-pulse' : ''} 
              />
              {/* Label */}
              {showLabel && (
                <text 
                  x={x} 
                  y={y - size - 5} 
                  textAnchor="middle" 
                  fill="white" 
                  fontSize={10} 
                  fontWeight="bold" 
                  style={{ textShadow: '0 0 4px rgba(0,0,0,0.9)' }}
                >
                  {node.label || node.id}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className={`absolute left-2 bg-slate-900/80 rounded-lg px-3 py-2 text-xs ${isFullscreen ? 'bottom-4' : 'bottom-2'}`}>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-slate-300">You</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-slate-300">Exit</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <span className="text-slate-300">Path</span>
          </div>
          {hasEmergency && (
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
              <span className="text-red-300">Hazard</span>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen hint */}
      {isFullscreen && (
        <div className="absolute top-2 left-2 bg-slate-800/80 rounded-lg px-3 py-1.5 text-xs text-slate-400">
          Press <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-300">ESC</kbd> to exit fullscreen
        </div>
      )}

      {/* CSS Animation */}
      <style>{`@keyframes dash { to { stroke-dashoffset: -25; } }`}</style>
    </div>
  );
}

export default FloorMapVisualization;
