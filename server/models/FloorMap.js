/**
 * @fileoverview FloorMap Model - Core Building Floor Data Structure
 * @description Defines the MongoDB schema for building floor maps used in
 *              the emergency evacuation system. Each floor contains a graph
 *              representation (nodes/edges), cameras, screens, and exit points.
 * 
 * @requires mongoose - MongoDB ODM
 * 
 * @example
 * // Creating a new floor:
 * const floor = new FloorMap({
 *   id: 'floor_1',
 *   name: 'Ground Floor',
 *   nodes: [...],
 *   edges: [...],
 *   cameras: [...],
 *   screens: [...],
 *   exitPoints: ['exit_north', 'exit_south']
 * });
 * 
 * @module models/FloorMap
 * @author Marcelino Saad
 * @version 1.0.0
 */

import mongoose from "mongoose";

/* ============================================
 * SUB-SCHEMAS
 * ============================================ */

/**
 * @typedef {Object} Camera
 * @property {string} id - Unique camera identifier (e.g., 'CAM_HALL_01')
 * @property {string} edgeId - ID of the edge this camera monitors
 * @property {string} [rtspUrl] - Optional custom RTSP stream URL
 * @property {string} status - Current operational status
 * @property {number} failureCount - Consecutive capture failures (auto-disable at threshold)
 * @property {Date} [lastFailure] - Timestamp of last failed capture
 * @property {Date} [lastSuccess] - Timestamp of last successful capture
 * @property {string} [disabledReason] - Explanation for disabled status
 * @property {Date} [disabledAt] - When the camera was disabled
 * @property {string} [disabledBy] - Who disabled it ('admin' or 'system')
 */
const CameraSchema = new mongoose.Schema({
  id: { type: String, required: true },
  edgeId: { type: String, required: true },
  rtspUrl: { type: String },
  status: { 
    type: String, 
    enum: ['active', 'disabled', 'maintenance', 'error'], 
    default: 'active' 
  },
  failureCount: { type: Number, default: 0 },
  lastFailure: { type: Date },
  lastSuccess: { type: Date },
  disabledReason: { type: String },
  disabledAt: { type: Date },
  disabledBy: { type: String }
}, { _id: false }); // Disable auto _id for embedded documents

/**
 * @typedef {Object} Screen
 * @property {string} id - Unique screen identifier (e.g., 'SCREEN_LOBBY')
 * @property {string} nodeId - ID of the node where screen is located (route start point)
 * @property {string} [name] - Human-readable screen name
 * @property {string} status - Current operational status
 * @property {string} [disabledReason] - Explanation for disabled status
 * @property {Date} [disabledAt] - When the screen was disabled
 * @property {string} [disabledBy] - Who disabled it ('admin')
 */
const ScreenSchema = new mongoose.Schema({
  id: { type: String, required: true },
  nodeId: { type: String, required: true },
  name: { type: String },
  status: { 
    type: String, 
    enum: ['active', 'disabled', 'maintenance'], 
    default: 'active' 
  },
  disabledReason: { type: String },
  disabledAt: { type: Date },
  disabledBy: { type: String }
}, { _id: false });

/* ============================================
 * MAIN SCHEMA
 * ============================================ */

/**
 * FloorMap Schema - Building floor graph and device configuration
 * 
 * @description
 * Represents a single floor in the building with:
 * - Graph structure (nodes and edges) for pathfinding
 * - Camera configurations for hazard detection
 * - Screen locations for evacuation route display
 * - Exit points for Dijkstra's algorithm destinations
 * - Real-world scale for accurate distance calculations
 */
const FloorMapSchema = new mongoose.Schema({
  // ─────────────────────────────────────────
  // IDENTIFICATION
  // ─────────────────────────────────────────
  /** @type {string} Unique floor identifier (e.g., 'floor_1', 'building_a_floor_2') */
  id: { type: String, required: true, unique: true },
  
  /** @type {string} Human-readable floor name */
  name: { type: String, required: true },
  
  // ─────────────────────────────────────────
  // STATUS MANAGEMENT
  // ─────────────────────────────────────────
  /** @type {string} Floor operational status - disabled floors are skipped in capture cycle */
  status: { 
    type: String, 
    enum: ['active', 'disabled', 'maintenance'], 
    default: 'active' 
  },
  disabledReason: { type: String },
  disabledAt: { type: Date },
  disabledBy: { type: String },
  
  // ─────────────────────────────────────────
  // MAP IMAGE & SCALE
  // ─────────────────────────────────────────
  /**
   * Floor plan image with real-world scale information
   * Used for visualization and accurate distance calculations
   */
  mapImage: {
    url: String,              // Cloudinary URL
    localUrl: String,         // Local filesystem path
    cloudinaryId: String,     // Cloudinary public ID for management
    widthPixels: Number,      // Image dimensions in pixels
    heightPixels: Number,
    widthMeters: Number,      // Real-world dimensions in meters
    heightMeters: Number
  },
  
  // ─────────────────────────────────────────
  // GRAPH STRUCTURE
  // ─────────────────────────────────────────
  /**
   * Graph nodes - Locations on the floor (junctions, rooms, exits)
   * Coordinates are in pixels relative to mapImage
   */
  nodes: [{
    id: { type: String, required: true },
    x: { type: Number, required: true },     // X coordinate in pixels
    y: { type: Number, required: true },     // Y coordinate in pixels
    label: String,                            // Display label
    type: { 
      type: String, 
      enum: ['room', 'hall', 'door', 'entrance', 'exit', 'junction'], 
      default: 'junction' 
    }
  }],
  
  /**
   * Graph edges - Corridors/paths connecting nodes
   * Contains static weight and dynamic AI-updated hazard data
   */
  edges: [{
    id: { type: String, required: true },
    from: { type: String, required: true },  // Source node ID
    to: { type: String, required: true },    // Target node ID
    staticWeight: { type: Number, default: 1 },
    
    // Thresholds - When exceeded, route is heavily penalized
    peopleThreshold: { type: Number, default: 10 },   // Max safe crowd count
    fireThreshold: { type: Number, default: 0.7 },    // Max safe fire probability
    smokeThreshold: { type: Number, default: 0.6 },   // Max safe smoke probability
    
    // Current AI-detected values (updated each capture cycle)
    currentPeopleCount: { type: Number, default: 0 },
    currentFireProb: { type: Number, default: 0 },
    currentSmokeProb: { type: Number, default: 0 }
  }],
  
  // ─────────────────────────────────────────
  // DEVICES
  // ─────────────────────────────────────────
  /** Cameras monitoring edges for hazard detection */
  cameras: [CameraSchema],
  
  /** Screens displaying evacuation routes (located at nodes) */
  screens: [ScreenSchema],
  
  // ─────────────────────────────────────────
  // LEGACY SUPPORT (Deprecated)
  // ─────────────────────────────────────────
  /** @deprecated Use cameras array instead */
  cameraToEdge: { type: Map, of: String },
  
  /** @deprecated Use screens array instead */
  startPoints: [{ type: String }],
  
  // ─────────────────────────────────────────
  // EXIT POINTS
  // ─────────────────────────────────────────
  /** Node IDs that are valid evacuation exits (Dijkstra destinations) */
  exitPoints: [{ type: String }]
}, {
  timestamps: true // Adds createdAt and updatedAt
});

/* ============================================
 * VIRTUALS
 * ============================================ */

/**
 * Get only active cameras (excludes disabled/maintenance/error)
 * @returns {Camera[]} Array of active camera objects
 */
FloorMapSchema.virtual('activeCameras').get(function() {
  return this.cameras?.filter(c => c.status === 'active') || [];
});

/**
 * Get only active screens (excludes disabled/maintenance)
 * @returns {Screen[]} Array of active screen objects
 */
FloorMapSchema.virtual('activeScreens').get(function() {
  return this.screens?.filter(s => s.status === 'active') || [];
});

/**
 * Get active start points for route calculation
 * @returns {string[]} Array of node IDs where active screens are located
 * @description Falls back to legacy startPoints if screens array is empty
 */
FloorMapSchema.virtual('activeStartPoints').get(function() {
  if (this.screens && this.screens.length > 0) {
    return this.screens
      .filter(s => s.status === 'active')
      .map(s => s.nodeId);
  }
  return this.startPoints || [];
});

/* ============================================
 * INSTANCE METHODS
 * ============================================ */

/**
 * Check if floor is operational and should be processed
 * @returns {boolean} True if floor status is 'active'
 */
FloorMapSchema.methods.isOperational = function() {
  return this.status === 'active';
};

/* ============================================
 * SCHEMA OPTIONS
 * ============================================ */

// Include virtuals when converting to JSON or Object
FloorMapSchema.set('toJSON', { virtuals: true });
FloorMapSchema.set('toObject', { virtuals: true });

export default mongoose.model("FloorMap", FloorMapSchema);
