/**
 * @fileoverview Route Model - Computed Evacuation Routes
 * @description Stores computed evacuation routes for each floor.
 *              Routes are calculated using Dijkstra's algorithm based on
 *              real-time hazard data from AI analysis.
 * 
 * @requires mongoose - MongoDB ODM
 * 
 * @example
 * // Route document created after each capture cycle:
 * const routeDoc = await Route.create({
 *   floorId: 'floor_1',
 *   routes: [
 *     { startNode: 'N1', exitNode: 'EXIT_NORTH', path: ['N1', 'N2', 'EXIT_NORTH'], ... }
 *   ],
 *   emergency: false,
 *   overallHazardLevel: 'safe'
 * });
 * 
 * @module models/Route
 * @author Marcelino Saad
 * @version 1.0.0
 */

import mongoose from "mongoose";

/**
 * Route Schema - Evacuation route computation results
 * 
 * @description
 * Stores route calculations for a floor at a point in time:
 * - Multiple routes (one per screen/start point)
 * - Each route includes path, distance, and hazard analysis
 * - Emergency flag indicates if any route has threshold violations
 * - Historical data for route playback and analysis
 */
const RouteSchema = new mongoose.Schema({
  // ─────────────────────────────────────────
  // IDENTIFICATION
  // ─────────────────────────────────────────
  /** @type {string} Floor this route set belongs to */
  floorId: String,
  
  /** @type {Date} When these routes were computed */
  computedAt: { type: Date, default: Date.now },
  
  // ─────────────────────────────────────────
  // ROUTE DATA
  // ─────────────────────────────────────────
  /**
   * Array of computed routes (one per active screen)
   * Each route is the shortest path from a screen to the nearest exit
   */
  routes: [{
    /** @type {string} Starting node ID (screen location) */
    startNode: String,
    
    /** @type {string} Destination exit node ID */
    exitNode: String,
    
    /** @type {string[]} Ordered array of node IDs forming the path */
    path: [String],
    
    /** @type {string[]} Ordered array of edge IDs along the path */
    edges: [String],
    
    /** @type {number} Weighted distance (includes hazard penalties) */
    distance: Number,
    
    /** @type {number} Actual real-world distance in meters */
    distanceMeters: Number,
    
    /** @type {string} Overall hazard assessment for this route */
    hazardLevel: { 
      type: String, 
      enum: ['safe', 'moderate', 'high', 'critical'], 
      default: 'safe' 
    },
    
    /** @type {boolean} True if any edge exceeds fire/smoke thresholds */
    exceedsThresholds: { type: Boolean, default: false },
    
    /**
     * Detailed hazard information for each edge in the route
     * Used for visualization and debugging
     */
    hazardDetails: [{
      edgeId: String,
      people: Number,           // People count on this edge
      fire: Number,             // Fire probability (0-1)
      smoke: Number,            // Smoke probability (0-1)
      thresholdRatio: Number,   // Max ratio vs threshold (>1 = exceeded)
      distanceMeters: Number    // Physical length of this edge
    }]
  }],
  
  // ─────────────────────────────────────────
  // FLOOR-LEVEL STATUS
  // ─────────────────────────────────────────
  /** @type {boolean} True if ANY route has threshold violations */
  emergency: { type: Boolean, default: false },
  
  /** @type {string} Worst hazard level across all routes */
  overallHazardLevel: { 
    type: String, 
    enum: ['safe', 'moderate', 'high', 'critical'], 
    default: 'safe' 
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

export default mongoose.model("Route", RouteSchema);
