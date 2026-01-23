/**
 * @fileoverview Dijkstra Shortest Path Algorithm with Dynamic Hazard Weighting
 * @description Implementation of Dijkstra's algorithm for evacuation route computation.
 *              Calculates optimal paths considering real-world distances, fire, smoke, 
 *              and crowd density with configurable penalty weights.
 * 
 * @requires ./distanceCalculator.js - Real-world distance calculation
 * @requires dotenv - Environment variable loading
 * 
 * @module utils/dijkstra
 * @author Marcelino Saad
 * @version 1.0.0
 * 
 * @exports computeShortestPaths - Main function to compute routes for all start points
 * 
 * @description
 * Algorithm Overview:
 * 1. For each start point (screen location), find shortest path to nearest exit
 * 2. Edge weights are dynamically calculated based on:
 *    - Real-world distance (meters)
 *    - Fire probability (multiplied if exceeds threshold)
 *    - Smoke probability (multiplied if exceeds threshold)
 *    - People count (additive penalty for congestion)
 * 3. Weights increase dramatically when thresholds are exceeded
 * 4. Routes are selected based on lowest total weight (safest + shortest)
 * 
 * Weight Calculation Formula:
 * - Base weight = distance_meters × staticWeight
 * - If threshold exceeded: weight × (1 + threshold_ratio × 100) × hazard_penalties
 * - Normal operation: weight × people_factor × fire_factor × smoke_factor
 * 
 * Environment Variables:
 * - DIJKSTRA_FIRE_PENALTY: Fire hazard penalty multiplier (default: 1000)
 * - DIJKSTRA_SMOKE_PENALTY: Smoke hazard penalty multiplier (default: 500)
 * - DIJKSTRA_PEOPLE_PENALTY: People congestion additive penalty (default: 2)
 * - DIJKSTRA_PEOPLE_FACTOR: People weight scaling factor (default: 0.5)
 * - DIJKSTRA_FIRE_FACTOR: Fire weight scaling factor (default: 2)
 * - DIJKSTRA_SMOKE_FACTOR: Smoke weight scaling factor (default: 1.5)
 * - DIJKSTRA_THRESHOLD_MULTIPLIER: Threshold violation multiplier (default: 100)
 * - DIJKSTRA_TIMING_LOGS: Enable performance logging (default: false)
 */

import { calculateRealWorldDistance } from './distanceCalculator.js';
import dotenv from 'dotenv';

dotenv.config();

/* ============================================================
 * DIJKSTRA WEIGHT CONFIGURATION
 * Configurable penalties and factors for path calculation
 * ============================================================ */

/** @const {number} FIRE_PENALTY - Multiplier for fire probability above threshold */
const FIRE_PENALTY = parseFloat(process.env.DIJKSTRA_FIRE_PENALTY || "1000");

/** @const {number} SMOKE_PENALTY - Multiplier for smoke probability above threshold */
const SMOKE_PENALTY = parseFloat(process.env.DIJKSTRA_SMOKE_PENALTY || "500");

/** @const {number} PEOPLE_PENALTY - Additive penalty per person above threshold */
const PEOPLE_PENALTY = parseFloat(process.env.DIJKSTRA_PEOPLE_PENALTY || "2");

/** @const {number} PEOPLE_FACTOR - Weight factor for normal people count */
const PEOPLE_FACTOR = parseFloat(process.env.DIJKSTRA_PEOPLE_FACTOR || "0.5");

/** @const {number} FIRE_FACTOR - Weight factor for normal fire probability */
const FIRE_FACTOR = parseFloat(process.env.DIJKSTRA_FIRE_FACTOR || "2");

/** @const {number} SMOKE_FACTOR - Weight factor for normal smoke probability */
const SMOKE_FACTOR = parseFloat(process.env.DIJKSTRA_SMOKE_FACTOR || "1.5");

/** @const {number} THRESHOLD_MULTIPLIER - Base multiplier when any threshold exceeded */
const THRESHOLD_MULTIPLIER = parseFloat(process.env.DIJKSTRA_THRESHOLD_MULTIPLIER || "100");

/* ============================================================
 * EDGE WEIGHT CALCULATION
 * ============================================================ */

/**
 * Calculates dynamic weight for a graph edge based on hazard conditions.
 * 
 * @function calculateEdgeWeight
 * @param {Object} edge - Edge object with threshold and current values
 * @param {number} [edge.staticWeight=1] - Base weight multiplier
 * @param {number} [edge.peopleThreshold=10] - Max people before penalty
 * @param {number} [edge.fireThreshold=0.7] - Max fire probability before penalty
 * @param {number} [edge.smokeThreshold=0.6] - Max smoke probability before penalty
 * @param {number} [edge.currentPeopleCount=0] - Current people count from AI
 * @param {number} [edge.currentFireProb=0] - Current fire probability from AI
 * @param {number} [edge.currentSmokeProb=0] - Current smoke probability from AI
 * @param {Object} nodeFrom - Source node with x, y coordinates
 * @param {Object} nodeTo - Destination node with x, y coordinates
 * @param {Object} scale - Scale object for real-world distance calculation
 * 
 * @returns {Object} Weight calculation result
 * @returns {number} .weight - Calculated edge weight
 * @returns {boolean} .exceedsThreshold - True if any threshold exceeded
 * @returns {number} .thresholdRatio - Max ratio of current/threshold values
 * @returns {number} .distanceMeters - Real-world distance in meters
 * 
 * @description
 * Weight increases dramatically when thresholds are exceeded:
 * - Fire/smoke thresholds trigger heavy multiplicative penalties
 * - People threshold triggers additive penalty per excess person
 * - Normal operation applies gradual factors as values approach thresholds
 */
const calculateEdgeWeight = (edge, nodeFrom, nodeTo, scale) => {
  // ─────────────────────────────────────────────
  // Extract edge properties with defaults
  // ─────────────────────────────────────────────
  const {
    staticWeight = 1,
    peopleThreshold = 10,
    fireThreshold = 0.7,
    smokeThreshold = 0.6,
    currentPeopleCount = 0,
    currentFireProb = 0,
    currentSmokeProb = 0
  } = edge;

  // ─────────────────────────────────────────────
  // Calculate real-world distance between nodes
  // ─────────────────────────────────────────────
  const distanceMeters = calculateRealWorldDistance(nodeFrom, nodeTo, scale);

  // ─────────────────────────────────────────────
  // Calculate threshold violations (excess amounts)
  // ─────────────────────────────────────────────
  const peopleExcess = Math.max(0, currentPeopleCount - peopleThreshold);
  const fireExcess = Math.max(0, currentFireProb - fireThreshold);
  const smokeExcess = Math.max(0, currentSmokeProb - smokeThreshold);

  // Check if any threshold is exceeded
  const exceedsThreshold = peopleExcess > 0 || fireExcess > 0 || smokeExcess > 0;

  // ─────────────────────────────────────────────
  // Calculate threshold ratio (how far over thresholds)
  // 0 = all thresholds met, >1 = at least one exceeded
  // ─────────────────────────────────────────────
  const peopleRatio = currentPeopleCount / peopleThreshold;
  const fireRatio = currentFireProb / fireThreshold;
  const smokeRatio = currentSmokeProb / smokeThreshold;
  const thresholdRatio = Math.max(peopleRatio, fireRatio, smokeRatio);

  // ─────────────────────────────────────────────
  // Calculate weight (start with distance-based)
  // ─────────────────────────────────────────────
  let weight = distanceMeters * staticWeight;

  if (exceedsThreshold) {
    // THRESHOLD EXCEEDED: Apply heavy penalties
    // This makes the algorithm strongly avoid hazardous paths
    weight *= (1 + thresholdRatio * THRESHOLD_MULTIPLIER);
    
    // Additional multiplicative penalties for fire/smoke
    if (fireExcess > 0) weight *= (1 + fireExcess * FIRE_PENALTY);
    if (smokeExcess > 0) weight *= (1 + smokeExcess * SMOKE_PENALTY);
    
    // Additive penalty for people (congestion)
    if (peopleExcess > 0) weight += peopleExcess * PEOPLE_PENALTY;
  } else {
    // NORMAL OPERATION: Gradual weight increase as approaching thresholds
    // This creates preference for less congested paths even when safe
    const peopleFactor = 1 + (currentPeopleCount / peopleThreshold) * PEOPLE_FACTOR;
    const fireFactor = 1 + (currentFireProb / fireThreshold) * FIRE_FACTOR;
    const smokeFactor = 1 + (currentSmokeProb / smokeThreshold) * SMOKE_FACTOR;
    
    weight *= peopleFactor * fireFactor * smokeFactor;
  }

  return { 
    weight, 
    exceedsThreshold, 
    thresholdRatio,
    distanceMeters
  };
};

/* ============================================================
 * PERFORMANCE MONITORING
 * ============================================================ */

/** @const {boolean} ENABLE_TIMING_LOGS - Enable verbose timing logs */
const ENABLE_TIMING_LOGS = process.env.DIJKSTRA_TIMING_LOGS === 'true';

/* ============================================================
 * MAIN PATHFINDING FUNCTIONS
 * ============================================================ */

/**
 * Computes shortest paths from all start points to nearest exits.
 * 
 * @function computeShortestPaths
 * @param {Object} graph - Graph data structure
 * @param {Array<Object>} graph.nodes - Array of node objects with id, x, y
 * @param {Array<Object>} graph.edges - Array of edge objects connecting nodes
 * @param {Object} graph.scale - Scale data for real-world distance calculation
 * @param {Array<string>} startNodeIds - Array of start node IDs (screen positions)
 * @param {Array<string>} exitNodeIds - Array of exit node IDs (evacuation exits)
 * 
 * @returns {Array<Object>} Array of route objects with timing metadata
 * @returns {string} [].startNode - Starting node ID
 * @returns {string} [].exitNode - Destination exit node ID
 * @returns {Array<string>} [].path - Array of node IDs in path order
 * @returns {Array<string>} [].edges - Array of edge IDs in path order
 * @returns {number} [].distance - Total weighted distance
 * @returns {number} [].distanceMeters - Total real-world distance in meters
 * @returns {string} [].hazardLevel - 'safe', 'moderate', or 'critical'
 * @returns {boolean} [].exceedsThresholds - True if route passes through hazards
 * @returns {Object} [].hazardDetails - Detailed hazard info for each edge
 * @returns {Object} []._timing - Performance timing metadata (attached to array)
 * 
 * @description
 * Processes each start point independently to find its optimal route.
 * Each route calculation uses Dijkstra's algorithm with dynamic weights.
 * Performance timing is collected for monitoring and optimization.
 * 
 * @example
 * const routes = computeShortestPaths(floor.graph, floor.startPoints, floor.exitPoints);
 * // routes[0] = { startNode: 'screen_1', exitNode: 'exit_a', path: [...], ... }
 */
export const computeShortestPaths = (graph, startNodeIds, exitNodeIds) => {
  // ─────────────────────────────────────────────
  // Initialize timing metrics
  // ─────────────────────────────────────────────
  const timingStart = performance.now();
  const timing = {
    totalMs: 0,
    routeTimings: [],
    graphStats: {
      nodes: graph.nodes?.length || 0,
      edges: graph.edges?.length || 0,
      startPoints: startNodeIds?.length || 0,
      exitPoints: exitNodeIds?.length || 0
    }
  };

  // ─────────────────────────────────────────────
  // Input validation
  // ─────────────────────────────────────────────
  if (!startNodeIds || !startNodeIds.length) {
    console.warn('No start points provided');
    return [];
  }

  if (!exitNodeIds || !exitNodeIds.length) {
    console.warn('No exit points provided');
    return [];
  }

  const routes = [];

  // ─────────────────────────────────────────────
  // Calculate route for each start point
  // Each start point gets its own optimal route
  // ─────────────────────────────────────────────
  for (const startNodeId of startNodeIds) {
    const routeStart = performance.now();
    const route = computeSingleRoute(graph, startNodeId, exitNodeIds);
    const routeEnd = performance.now();
    const routeMs = routeEnd - routeStart;
    
    // Record timing for this route
    timing.routeTimings.push({
      startNode: startNodeId,
      ms: parseFloat(routeMs.toFixed(2)),
      found: !!route
    });
    
    if (route) {
      routes.push({
        startNode: startNodeId,
        ...route
      });
    }
  }

  // ─────────────────────────────────────────────
  // Finalize timing metrics
  // ─────────────────────────────────────────────
  timing.totalMs = parseFloat((performance.now() - timingStart).toFixed(2));
  timing.avgRouteMs = timing.routeTimings.length > 0 
    ? parseFloat((timing.totalMs / timing.routeTimings.length).toFixed(2)) 
    : 0;

  if (ENABLE_TIMING_LOGS) {
    console.log(`⏱️ Dijkstra: ${timing.totalMs}ms total | ${timing.routeTimings.length} routes | avg ${timing.avgRouteMs}ms/route`);
  }

  // Attach timing metadata to routes array
  routes._timing = timing;
  
  return routes;
};

/* ============================================================
 * SINGLE ROUTE COMPUTATION
 * ============================================================ */

/**
 * Computes the shortest route from one start point to the nearest exit.
 * Uses Dijkstra's algorithm with a priority queue.
 * 
 * @function computeSingleRoute
 * @param {Object} graph - Graph data structure
 * @param {string} startNodeId - Starting node ID
 * @param {Array<string>} exitNodeIds - Array of possible exit node IDs
 * 
 * @returns {Object|null} Route object or null if no path exists
 * @returns {string} .exitNode - Destination exit node ID
 * @returns {Array<string>} .path - Array of node IDs in path order
 * @returns {Array<string>} .edges - Array of edge IDs in path order
 * @returns {number} .distance - Total weighted distance
 * @returns {number} .distanceMeters - Total real-world distance in meters
 * @returns {string} .hazardLevel - Hazard classification
 * @returns {boolean} .exceedsThresholds - Whether route passes through hazards
 * @returns {Object} .hazardDetails - Detailed hazard info for each edge
 * 
 * @description
 * Algorithm steps:
 * 1. Build node lookup map and adjacency list
 * 2. Calculate weights for all edges based on current conditions
 * 3. Run Dijkstra's algorithm from start node
 * 4. Early exit when any valid exit is reached
 * 5. Reconstruct path and analyze hazards
 */
const computeSingleRoute = (graph, startNodeId, exitNodeIds) => {
  // ─────────────────────────────────────────────
  // Build node lookup map for O(1) access
  // ─────────────────────────────────────────────
  const nodeMap = {};
  graph.nodes.forEach(n => (nodeMap[n.id] = n));

  // Validate start node exists
  if (!nodeMap[startNodeId]) {
    console.error(`Start node ${startNodeId} not found in graph`);
    return null;
  }

  // Filter to only valid exit nodes (exist in graph)
  const validExits = exitNodeIds.filter(id => nodeMap[id]);
  if (validExits.length === 0) {
    console.error(`No valid exit nodes found in graph`);
    return null;
  }

  // ─────────────────────────────────────────────
  // Build adjacency list with calculated weights
  // Store weight info for later analysis
  // ─────────────────────────────────────────────
  const adj = {};
  const edgeWeightInfo = {}; // edgeId -> weight info for analysis

  graph.nodes.forEach(n => (adj[n.id] = []));
  
  graph.edges.forEach(e => {
    const nodeFrom = nodeMap[e.from];
    const nodeTo = nodeMap[e.to];
    
    if (!nodeFrom || !nodeTo) {
      console.warn(`Edge ${e.id} references non-existent nodes: ${e.from} or ${e.to}`);
      return;
    }

    // Calculate weight for this edge
    const weightInfo = calculateEdgeWeight(e, nodeFrom, nodeTo, graph.scale);
    edgeWeightInfo[e.id] = weightInfo;
    
    // Add bidirectional edges (undirected graph)
    adj[e.from].push({ to: e.to, weight: weightInfo.weight, edgeId: e.id });
    adj[e.to].push({ to: e.from, weight: weightInfo.weight, edgeId: e.id });
  });

  // ─────────────────────────────────────────────
  // Dijkstra's Algorithm
  // ─────────────────────────────────────────────
  const dist = {};     // Shortest distance to each node
  const prev = {};     // Previous node in shortest path
  const visited = new Set();

  // Initialize all distances to infinity
  Object.keys(adj).forEach(k => (dist[k] = Infinity));
  dist[startNodeId] = 0;

  // Priority queue (min-heap simulation using sorted array)
  // Note: For large graphs, consider using a proper min-heap implementation
  // Priority queue initialization
  const pq = [{ id: startNodeId, d: 0 }];

  // ─────────────────────────────────────────────
  // Main Dijkstra loop
  // Process nodes in order of shortest distance
  // ─────────────────────────────────────────────
  while (pq.length) {
    // Extract node with minimum distance (sort-based min extraction)
    pq.sort((a, b) => a.d - b.d);
    const current = pq.shift();

    // Skip if already visited (duplicate entry in queue)
    if (visited.has(current.id)) continue;
    visited.add(current.id);

    // Early exit optimization: stop when we reach any exit
    if (validExits.includes(current.id)) break;

    // Explore all neighbors
    for (const neighbor of adj[current.id]) {
      if (visited.has(neighbor.to)) continue;

      const newDist = current.d + neighbor.weight;
      if (newDist < dist[neighbor.to]) {
        dist[neighbor.to] = newDist;
        prev[neighbor.to] = { nodeId: current.id, edgeId: neighbor.edgeId };
        pq.push({ id: neighbor.to, d: newDist });
      }
    }
  }

  // ─────────────────────────────────────────────
  // Find nearest reachable exit
  // ─────────────────────────────────────────────
  let bestExit = null;
  let bestDist = Infinity;

  for (const exitId of validExits) {
    if (dist[exitId] < bestDist) {
      bestExit = exitId;
      bestDist = dist[exitId];
    }
  }

  // No route found to any exit
  if (!bestExit || bestDist === Infinity) {
    console.error(`No route possible from ${startNodeId} to any exit`);
    return null;
  }

  // ─────────────────────────────────────────────
  // Reconstruct path and analyze route
  // ─────────────────────────────────────────────
  const pathData = reconstructPath(prev, startNodeId, bestExit);
  
  // Calculate total real-world distance (sum of edge distances)
  const routeMetrics = calculateRouteMetrics(pathData.edges, graph.edges, edgeWeightInfo);
  
  // Analyze hazards along the route
  const routeHazards = analyzeRouteHazards(pathData.edges, graph.edges, edgeWeightInfo);

  return {
    exitNode: bestExit,
    path: pathData.nodes,
    edges: pathData.edges,
    distance: bestDist,
    distanceMeters: routeMetrics.totalDistanceMeters,
    hazardLevel: routeHazards.level,
    exceedsThresholds: routeHazards.exceedsThresholds,
    hazardDetails: routeHazards.details
  };
};

/* ============================================================
 * PATH RECONSTRUCTION
 * ============================================================ */

/**
 * Reconstructs the path from start to end using the prev map.
 * 
 * @function reconstructPath
 * @param {Object} prev - Map of nodeId -> { nodeId, edgeId } for previous node
 * @param {string} startId - Starting node ID
 * @param {string} endId - Ending node ID
 * 
 * @returns {Object} Path data
 * @returns {Array<string>} .nodes - Array of node IDs in path order
 * @returns {Array<string>} .edges - Array of edge IDs in path order
 * 
 * @description
 * Walks backwards from end to start using the prev map,
 * then reverses to get the correct order.
 */
const reconstructPath = (prev, startId, endId) => {
  const nodes = [];
  const edges = [];
  let current = endId;

  // Walk backwards from end to start
  while (current) {
    nodes.unshift(current);
    if (current === startId) break;
    
    const prevInfo = prev[current];
    if (!prevInfo) break;
    
    if (prevInfo.edgeId) edges.unshift(prevInfo.edgeId);
    current = prevInfo.nodeId;
  }

  return { nodes, edges };
};

/* ============================================================
 * ROUTE METRICS CALCULATION
 * ============================================================ */

/**
 * Calculates total route metrics including real-world distance.
 * 
 * @function calculateRouteMetrics
 * @param {Array<string>} edgeIds - Array of edge IDs in the route
 * @param {Array<Object>} allEdges - All edges in the graph
 * @param {Object} edgeWeightInfo - Map of edgeId -> weight calculation info
 * 
 * @returns {Object} Route metrics
 * @returns {number} .totalDistanceMeters - Total real-world distance in meters
 */
const calculateRouteMetrics = (edgeIds, allEdges, edgeWeightInfo) => {
  let totalDistanceMeters = 0;

  for (const edgeId of edgeIds) {
    const weightInfo = edgeWeightInfo[edgeId];
    if (weightInfo) {
      totalDistanceMeters += weightInfo.distanceMeters || 0;
    }
  }

  return {
    totalDistanceMeters: parseFloat(totalDistanceMeters.toFixed(2))
  };
};

/* ============================================================
 * HAZARD ANALYSIS
 * ============================================================ */

/**
 * Analyzes hazards along a route for display and safety warnings.
 * 
 * @function analyzeRouteHazards
 * @param {Array<string>} edgeIds - Array of edge IDs in the route
 * @param {Array<Object>} allEdges - All edges in the graph
 * @param {Object} edgeWeightInfo - Map of edgeId -> weight calculation info
 * 
 * @returns {Object} Hazard analysis result
 * @returns {string} .level - 'safe', 'moderate', or 'critical'
 * @returns {boolean} .exceedsThresholds - True if any edge exceeds fire/smoke threshold
 * @returns {number} .maxFireRatio - Maximum fire probability ratio
 * @returns {number} .maxSmokeRatio - Maximum smoke probability ratio
 * @returns {Array<Object>} .details - Per-edge hazard details
 * 
 * @description
 * IMPORTANT: People count affects pathfinding (route selection) but NOT hazard level.
 * Hazard level is determined only by fire and smoke (actual dangers).
 * This ensures routes avoid congestion while accurately reporting danger levels.
 * 
 * Hazard levels:
 * - 'safe': All fire/smoke ratios < 0.7 (within safe margins)
 * - 'moderate': Max fire/smoke ratio >= 0.7 but < 1.0 (approaching danger)
 * - 'critical': Max fire/smoke ratio >= 1.0 (threshold exceeded)
 */
const analyzeRouteHazards = (edgeIds, allEdges, edgeWeightInfo) => {
  let maxFireRatio = 0;
  let maxSmokeRatio = 0;
  let exceedsThresholds = false;
  const details = [];

  for (const edgeId of edgeIds) {
    const edge = allEdges.find(e => e.id === edgeId);
    const weightInfo = edgeWeightInfo[edgeId];

    if (edge) {
      // Calculate ratios relative to each edge's threshold
      const fireRatio = (edge.currentFireProb || 0) / (edge.fireThreshold || 0.7);
      const smokeRatio = (edge.currentSmokeProb || 0) / (edge.smokeThreshold || 0.6);

      maxFireRatio = Math.max(maxFireRatio, fireRatio);
      maxSmokeRatio = Math.max(maxSmokeRatio, smokeRatio);

      // Hazard threshold exceeded only for fire/smoke (not people)
      const fireExceeds = (edge.currentFireProb || 0) > (edge.fireThreshold || 0.7);
      const smokeExceeds = (edge.currentSmokeProb || 0) > (edge.smokeThreshold || 0.6);
      
      if (fireExceeds || smokeExceeds) {
        exceedsThresholds = true;
      }

      // Include edge details for transparency (debugging and display)
      details.push({
        edgeId,
        people: edge.currentPeopleCount || 0,
        fire: edge.currentFireProb || 0,
        smoke: edge.currentSmokeProb || 0,
        exceeds: fireExceeds || smokeExceeds,
        distanceMeters: weightInfo?.distanceMeters || 0
      });
    }
  }

  // ─────────────────────────────────────────────
  // Determine overall hazard level
  // Based on fire/smoke only, not people count
  // ─────────────────────────────────────────────
  const maxHazardRatio = Math.max(maxFireRatio, maxSmokeRatio);
  let level = 'safe';
  
  if (maxHazardRatio >= 1.0) {
    level = 'critical';  // Threshold exceeded - active hazard
  } else if (maxHazardRatio >= 0.7) {
    level = 'moderate';  // Approaching threshold - caution
  }

  return {
    level,
    exceedsThresholds,
    maxFireRatio: parseFloat(maxFireRatio.toFixed(2)),
    maxSmokeRatio: parseFloat(maxSmokeRatio.toFixed(2)),
    details
  };
};
