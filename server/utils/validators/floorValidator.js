/**
 * @fileoverview FloorMap Validation Utilities
 * @description Comprehensive validation for floor map data ensuring:
 *              - Unique IDs across all floors (nodes, edges, cameras, screens)
 *              - Valid references between entities
 *              - Data integrity for graph operations
 * 
 * @requires FloorMap - MongoDB model for floor data
 * 
 * @module utils/validators/floorValidator
 * @author Marcelino Saad
 * @version 1.0.0
 * 
 * @exports validateFloorData - Validate floor for create/update operations
 */

import FloorMap from "../../models/FloorMap.js";

/* ============================================================
 * FLOOR DATA VALIDATION
 * ============================================================ */

/**
 * Validates floor data for uniqueness constraints across all floors.
 * Used during floor creation and updates to ensure data integrity.
 * 
 * @async
 * @function validateFloorData
 * @param {Object} floorData - Floor data to validate
 * @param {Array} floorData.nodes - Graph nodes with unique IDs
 * @param {Array} floorData.edges - Graph edges with unique IDs
 * @param {Array} [floorData.cameras] - Camera configurations
 * @param {Array} [floorData.screens] - Screen configurations
 * @param {Object} [floorData.cameraToEdge] - Legacy camera mapping
 * @param {Array} [floorData.startPoints] - Legacy screen locations
 * @param {Array} [floorData.exitPoints] - Exit node IDs
 * @param {string|null} excludeFloorId - Floor ID to exclude (for updates)
 * @returns {Promise<Object>} Validation result
 * @returns {boolean} returns.valid - Whether validation passed
 * @returns {string[]} returns.errors - Array of error messages
 * 
 * @description
 * Validation checks:
 * 1. No duplicate node IDs within floor or across floors
 * 2. No duplicate edge IDs within floor or across floors
 * 3. No duplicate camera IDs within floor or across floors
 * 4. No duplicate screen IDs within floor or across floors
 * 5. Edge from/to references valid nodes
 * 6. Camera edgeId references valid edge
 * 7. Screen nodeId references valid node
 * 8. startPoints reference valid nodes
 * 9. exitPoints reference valid nodes
 */
export const validateFloorData = async (floorData, excludeFloorId = null) => {
  const errors = [];
  
  // Get all existing floors (excluding current one for updates)
  const query = excludeFloorId ? { id: { $ne: excludeFloorId } } : {};
  const existingFloors = await FloorMap.find(query);

  // ─────────────────────────────────────────────
  // COLLECT EXISTING IDS FROM OTHER FLOORS
  // ─────────────────────────────────────────────
  const existingNodeIds = new Set();
  const existingEdgeIds = new Set();
  const existingCameraIds = new Set();
  const existingScreenIds = new Set();

  for (const floor of existingFloors) {
    // Collect node IDs
    floor.nodes?.forEach(n => existingNodeIds.add(n.id));
    // Collect edge IDs
    floor.edges?.forEach(e => existingEdgeIds.add(e.id));
    
    // Collect camera IDs (new format)
    floor.cameras?.forEach(c => existingCameraIds.add(c.id));
    // Collect camera IDs (legacy cameraToEdge map)
    if (floor.cameraToEdge) {
      for (const camId of floor.cameraToEdge.keys()) {
        existingCameraIds.add(camId);
      }
    }
    
    // Collect screen IDs (new format)
    floor.screens?.forEach(s => existingScreenIds.add(s.id));
  }

  // ─────────────────────────────────────────────
  // VALIDATE NODE IDS
  // ─────────────────────────────────────────────
  const nodeIds = floorData.nodes?.map(n => n.id) || [];
  const nodeIdSet = new Set();
  
  for (const nodeId of nodeIds) {
    // Check for duplicates within this floor
    if (nodeIdSet.has(nodeId)) {
      errors.push(`Duplicate node ID '${nodeId}' within floor`);
    }
    nodeIdSet.add(nodeId);
    
    // Check for duplicates across other floors
    if (existingNodeIds.has(nodeId)) {
      errors.push(`Node ID '${nodeId}' already exists in another floor`);
    }
  }

  // ─────────────────────────────────────────────
  // VALIDATE EDGE IDS
  // ─────────────────────────────────────────────
  const edgeIds = floorData.edges?.map(e => e.id) || [];
  const edgeIdSet = new Set();
  
  for (const edgeId of edgeIds) {
    // Check for duplicates within this floor
    if (edgeIdSet.has(edgeId)) {
      errors.push(`Duplicate edge ID '${edgeId}' within floor`);
    }
    edgeIdSet.add(edgeId);
    
    // Check for duplicates across other floors
    if (existingEdgeIds.has(edgeId)) {
      errors.push(`Edge ID '${edgeId}' already exists in another floor`);
    }
  }

  // ─────────────────────────────────────────────
  // VALIDATE CAMERAS (NEW ARRAY FORMAT)
  // ─────────────────────────────────────────────
  const cameraIdSet = new Set();
  
  for (const camera of (floorData.cameras || [])) {
    // Check for duplicates within this floor
    if (cameraIdSet.has(camera.id)) {
      errors.push(`Duplicate camera ID '${camera.id}' within floor`);
    }
    cameraIdSet.add(camera.id);
    
    // Check for duplicates across other floors
    if (existingCameraIds.has(camera.id)) {
      errors.push(`Camera ID '${camera.id}' already exists in another floor`);
    }
    
    // Validate edgeId reference exists
    if (camera.edgeId && !edgeIdSet.has(camera.edgeId)) {
      errors.push(`Camera '${camera.id}' references non-existent edge '${camera.edgeId}'`);
    }
  }

  // ─────────────────────────────────────────────
  // VALIDATE CAMERAS (LEGACY CAMEROTOEDGE MAP)
  // ─────────────────────────────────────────────
  const legacyCameraIds = floorData.cameraToEdge ? Object.keys(
    typeof floorData.cameraToEdge === 'object' && !Array.isArray(floorData.cameraToEdge)
      ? floorData.cameraToEdge
      : Object.fromEntries(floorData.cameraToEdge)
  ) : [];
  
  for (const camId of legacyCameraIds) {
    // Check for conflict with new cameras array
    if (cameraIdSet.has(camId)) {
      errors.push(`Duplicate camera ID '${camId}' (exists in both cameras array and cameraToEdge)`);
    }
    cameraIdSet.add(camId);
    
    // Check for duplicates across other floors
    if (existingCameraIds.has(camId)) {
      errors.push(`Camera ID '${camId}' already exists in another floor`);
    }
  }

  // ─────────────────────────────────────────────
  // VALIDATE SCREENS (NEW ARRAY FORMAT)
  // ─────────────────────────────────────────────
  const screenIdSet = new Set();
  
  for (const screen of (floorData.screens || [])) {
    // Check for duplicates within this floor
    if (screenIdSet.has(screen.id)) {
      errors.push(`Duplicate screen ID '${screen.id}' within floor`);
    }
    screenIdSet.add(screen.id);
    
    // Check for duplicates across other floors
    if (existingScreenIds.has(screen.id)) {
      errors.push(`Screen ID '${screen.id}' already exists in another floor`);
    }
    
    // Validate nodeId reference exists
    if (screen.nodeId && !nodeIdSet.has(screen.nodeId)) {
      errors.push(`Screen '${screen.id}' references non-existent node '${screen.nodeId}'`);
    }
  }

  // ─────────────────────────────────────────────
  // VALIDATE EDGE REFERENCES (from/to nodes)
  // ─────────────────────────────────────────────
  for (const edge of (floorData.edges || [])) {
    if (!nodeIdSet.has(edge.from)) {
      errors.push(`Edge '${edge.id}' references non-existent node '${edge.from}'`);
    }
    if (!nodeIdSet.has(edge.to)) {
      errors.push(`Edge '${edge.id}' references non-existent node '${edge.to}'`);
    }
  }

  // ─────────────────────────────────────────────
  // VALIDATE STARTPOINTS (LEGACY)
  // ─────────────────────────────────────────────
  for (const startPoint of (floorData.startPoints || [])) {
    if (!nodeIdSet.has(startPoint)) {
      errors.push(`startPoint '${startPoint}' is not defined in nodes`);
    }
  }

  // ─────────────────────────────────────────────
  // VALIDATE EXITPOINTS
  // ─────────────────────────────────────────────
  for (const exitPoint of (floorData.exitPoints || [])) {
    if (!nodeIdSet.has(exitPoint)) {
      errors.push(`exitPoint '${exitPoint}' is not defined in nodes`);
    }
  }

  // ─────────────────────────────────────────────
  // VALIDATE CAMEROTOEDGE REFERENCES (LEGACY)
  // ─────────────────────────────────────────────
  for (const [camId, edgeId] of Object.entries(
    typeof floorData.cameraToEdge === 'object' && !Array.isArray(floorData.cameraToEdge)
      ? floorData.cameraToEdge
      : Object.fromEntries(floorData.cameraToEdge || [])
  )) {
    if (!edgeIdSet.has(edgeId)) {
      errors.push(`Camera '${camId}' references non-existent edge '${edgeId}'`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
};
