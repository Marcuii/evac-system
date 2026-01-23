/**
 * @fileoverview Socket.IO Route Socket Handler
 * @description Real-time WebSocket communication for evacuation route updates.
 *              Enables instant route broadcasts to display screens.
 * 
 * @requires socket.io - WebSocket library
 * @requires FloorMap - MongoDB model for floor validation
 * 
 * @module sockets/routeSocket
 * @author Marcelino Saad
 * @version 1.0.0
 * 
 * @exports initSocket - Initialize Socket.IO handlers
 * @exports ioEmit - Broadcast to all connected clients
 * @exports ioEmitToFloor - Broadcast to specific floor room
 * @exports getActiveSocketCount - Get number of registered connections
 * @exports getActiveFloorIds - Get list of connected floor IDs
 * 
 * @description
 * Architecture:
 * - Each display screen connects and registers for a specific floor
 * - Screens join a room named 'floor:{floorId}' for targeted broadcasts
 * - Route updates are sent to floor rooms (targeted) and globally (backwards compat)
 * - Used to determine if USRP fallback is needed (no sockets = use USRP)
 */

import FloorMap from "../models/FloorMap.js";

/* ============================================================
 * STATE MANAGEMENT
 * ============================================================ */

/** @type {import('socket.io').Server|null} ioRef - Socket.IO server reference */
let ioRef = null;

/** @type {Map<string, {floorId: string, floorName: string}>} - Maps socketId to floor info */
let registeredFloors = new Map();

/* ============================================================
 * SOCKET INITIALIZATION
 * ============================================================ */

/**
 * Initializes Socket.IO event handlers.
 * 
 * @function initSocket
 * @param {import('socket.io').Server} io - Socket.IO server instance
 * 
 * @description
 * Handles:
 * - Client connections (logging)
 * - Floor registration with validation
 * - Client disconnections (cleanup)
 * 
 * Registration flow:
 * 1. Client connects -> awaits registration
 * 2. Client emits 'register_floor' with { floorId }
 * 3. Server validates floorId exists in database
 * 4. Server adds client to floor room and confirms
 * 5. Client can now receive 'floor-routes' events
 */
export const initSocket = (io) => { 
  ioRef = io; 
  
  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id} (awaiting registration)`);
    
    // ─────────────────────────────────────────────
    // FLOOR REGISTRATION HANDLER
    // One socket per floor display screen
    // ─────────────────────────────────────────────
    socket.on("register_floor", async (data) => {
      const { floorId } = data;
      
      // Validate floorId provided
      if (!floorId) {
        socket.emit("registration_error", { 
          error: "Missing floorId",
          timestamp: new Date().toISOString() 
        });
        socket.disconnect(true);
        return;
      }
      
      // Validate floor exists in database
      const floor = await FloorMap.findOne({ id: floorId });
      if (!floor) {
        socket.emit("registration_error", { 
          error: `Floor '${floorId}' not found`,
          timestamp: new Date().toISOString() 
        });
        console.warn(`Floor registration rejected: invalid floorId '${floorId}' - disconnecting`);
        socket.disconnect(true);
        return;
      }
      
      // Register the floor socket
      socket.floorId = floorId;
      registeredFloors.set(socket.id, { floorId, floorName: floor.name });
      
      // Join floor-specific room for targeted broadcasts
      socket.join(`floor:${floorId}`);
      
      // Send confirmation with floor details
      socket.emit("registration_confirmed", { 
        floorId,
        floorName: floor.name,
        startPoints: floor.startPoints,
        exitPoints: floor.exitPoints,
        timestamp: new Date().toISOString() 
      });
      console.log(`✓ Floor registered: ${floorId} (${floor.name}) - ${registeredFloors.size} floors active`);
    });
    
    // ─────────────────────────────────────────────
    // DISCONNECT HANDLER
    // Clean up registration state
    // ─────────────────────────────────────────────
    socket.on("disconnect", () => {
      const floorInfo = registeredFloors.get(socket.id);
      registeredFloors.delete(socket.id);
      
      if (floorInfo) {
        console.log(`✗ Floor disconnected: ${floorInfo.floorId} (${floorInfo.floorName}) - ${registeredFloors.size} floors active`);
      } else {
        console.log(`Socket disconnected (unregistered): ${socket.id}`);
      }
    });
  });
};

/* ============================================================
 * EMIT FUNCTIONS
 * ============================================================ */

/**
 * Broadcasts an event to ALL connected clients.
 * 
 * @function ioEmit
 * @param {string} event - Event name
 * @param {Object} payload - Event data
 * 
 * @description
 * Used for backwards compatibility with older screen clients.
 * Prefer ioEmitToFloor() for targeted broadcasts.
 */
export const ioEmit = (event, payload) => { 
  if (ioRef) ioRef.emit(event, payload); 
};

/**
 * Broadcasts an event to a specific floor room.
 * 
 * @function ioEmitToFloor
 * @param {string} floorId - Target floor ID
 * @param {string} event - Event name
 * @param {Object} payload - Event data
 * 
 * @description
 * Sends to all clients that have registered for the specified floor.
 * More efficient than global broadcast for multi-floor buildings.
 * 
 * @example
 * ioEmitToFloor('floor_1', 'floor-routes', { routes: [...] });
 */
export const ioEmitToFloor = (floorId, event, payload) => {
  if (ioRef) {
    ioRef.to(`floor:${floorId}`).emit(event, payload);
  }
};

/* ============================================================
 * STATUS FUNCTIONS
 * ============================================================ */

/**
 * Gets the number of currently registered floor connections.
 * 
 * @function getActiveSocketCount
 * @returns {number} Number of registered floor sockets
 */
export const getActiveSocketCount = () => registeredFloors.size;

/**
 * Gets the list of floor IDs with active socket connections.
 * 
 * @function getActiveFloorIds
 * @returns {string[]} Array of floor IDs with active connections
 * 
 * @description
 * Used by periodic job to determine if USRP fallback is needed.
 * If a floor has no active socket, routes are sent via USRP instead.
 */
export const getActiveFloorIds = () => {
  return Array.from(registeredFloors.values()).map(f => f.floorId);
};
