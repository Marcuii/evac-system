/**
 * @fileoverview Update Floor Controller
 * @description Handles partial or full updates to existing floor maps.
 *              Supports updating graph data, cameras, screens, and floor images.
 * 
 * @route PUT /api/floors/:id
 * @access Admin (requires x-admin-auth header)
 * 
 * @requires FloorMap - MongoDB model for floor data
 * @requires uploadFloorImageToCloud - Cloudinary upload utility
 * @requires validateFloorData - Cross-floor uniqueness validator
 * 
 * @module controllers/floors/updateFloor
 * @author Marcelino Saad
 * @version 1.0.0
 */

import FloorMap from "../../models/FloorMap.js";
import { uploadFloorImageToCloud } from "../../utils/storage/uploadCloudImage.js";
import { validateFloorData } from "../../utils/validators/floorValidator.js";

/**
 * Updates an existing floor map with provided data.
 * 
 * @async
 * @function updateFloor
 * @param {import('express').Request} req - Express request object
 * @param {string} req.params.id - Floor ID to update
 * @param {Object} req.body - Update data (all fields optional)
 * @param {string} [req.body.name] - Updated floor name
 * @param {Array} [req.body.nodes] - Updated graph nodes
 * @param {Array} [req.body.edges] - Updated graph edges
 * @param {Object} [req.body.cameraToEdge] - Updated camera mapping
 * @param {Array} [req.body.startPoints] - Updated screen locations
 * @param {Array} [req.body.exitPoints] - Updated exit nodes
 * @param {Express.Multer.File} [req.file] - New floor plan image
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<Response>} JSON response with updated floor or error
 * 
 * @description
 * Workflow:
 * 1. Parse JSON fields from multipart/form-data
 * 2. Verify floor exists
 * 3. Validate uniqueness (excludes current floor from check)
 * 4. Upload new image if provided
 * 5. Merge updates with existing data using Object.assign
 * 
 * @note Supports partial updates - only provided fields are updated
 * 
 * @example
 * // Request (multipart/form-data): PUT /api/floors/floor_1
 * // - name: 'Ground Floor - Updated'
 * // - nodes: '[{\"id\":\"N1\",\"x\":150,\"y\":150}]'
 * 
 * // Response (200):
 * // { status: 200, data: { data: {...}, message: 'Floor updated successfully' } }
 */
const updateFloor = async (req, res) => {
  try {
    const floorId = req.params.id;
    const updateData = req.body;

    // ─────────────────────────────────────────────
    // PARSE JSON FIELDS
    // multipart/form-data sends arrays as strings
    // ─────────────────────────────────────────────
    if (typeof updateData.nodes === "string") {
      updateData.nodes = JSON.parse(updateData.nodes);
    }
    if (typeof updateData.edges === "string") {
      updateData.edges = JSON.parse(updateData.edges);
    }
    if (typeof updateData.cameraToEdge === "string") {
      updateData.cameraToEdge = JSON.parse(updateData.cameraToEdge);
    }
    if (typeof updateData.startPoints === "string") {
      updateData.startPoints = JSON.parse(updateData.startPoints);
    }
    if (typeof updateData.exitPoints === "string") {
      updateData.exitPoints = JSON.parse(updateData.exitPoints);
    }

    // ─────────────────────────────────────────────
    // VERIFY FLOOR EXISTS
    // ─────────────────────────────────────────────
    const existingFloor = await FloorMap.findOne({ id: floorId });
    if (!existingFloor) {
      return res.status(404).json({
        status: 404,
        data: {
          data: null,
          message: `Floor with ID '${floorId}' not found`,
        },
      });
    }

    // ─────────────────────────────────────────────
    // VALIDATE CROSS-FLOOR UNIQUENESS
    // Excludes current floor from duplicate check
    // ─────────────────────────────────────────────
    if (updateData.nodes || updateData.edges || updateData.cameraToEdge || updateData.startPoints || updateData.exitPoints) {
      // Merge updated fields with existing data for validation
      const dataToValidate = {
        nodes: updateData.nodes || existingFloor.nodes,
        edges: updateData.edges || existingFloor.edges,
        cameraToEdge: updateData.cameraToEdge || existingFloor.cameraToEdge,
        startPoints: updateData.startPoints || existingFloor.startPoints,
        exitPoints: updateData.exitPoints || existingFloor.exitPoints
      };
      
      // Pass floorId to exclude from uniqueness check
      const validation = await validateFloorData(dataToValidate, floorId);
      if (!validation.valid) {
        return res.status(400).json({
          status: 400,
          data: {
            data: null,
            message: "Validation failed: " + validation.errors.join("; "),
          },
        });
      }
    }

    // ─────────────────────────────────────────────
    // UPLOAD NEW IMAGE (if provided)
    // ─────────────────────────────────────────────
    if (req.file) {
      try {
        const uploadResult = await uploadFloorImageToCloud(req.file.path, floorId);
        if (uploadResult) {
          updateData.mapImage = {
            url: uploadResult.url,
            localUrl: req.file.path,
            cloudinaryId: uploadResult.cloudinaryId,
            width: uploadResult.width,
            height: uploadResult.height,
          };
        }
      } catch (uploadErr) {
        return res.status(500).json({
          status: 500,
          data: {
            data: null,
            message: "Floor image upload failed: " + uploadErr.message,
          },
        });
      }
    }

    // ─────────────────────────────────────────────
    // SYNC CAMERAS ARRAY FROM cameraToEdge
    // Keep cameras array in sync with cameraToEdge mapping
    // ─────────────────────────────────────────────
    const cameraToEdge = updateData.cameraToEdge || existingFloor.cameraToEdge;
    if (cameraToEdge && Object.keys(cameraToEdge).length > 0) {
      // Get existing cameras to preserve their status/metadata
      const existingCameras = existingFloor.cameras || [];
      const existingCameraMap = {};
      existingCameras.forEach(cam => {
        existingCameraMap[cam.id] = cam;
      });
      
      // Generate updated cameras array
      updateData.cameras = Object.entries(cameraToEdge).map(([cameraId, edgeId]) => {
        // Preserve existing camera metadata if camera already exists
        const existing = existingCameraMap[cameraId];
        if (existing) {
          return {
            ...existing.toObject ? existing.toObject() : existing,
            edgeId: edgeId // Update edge mapping
          };
        }
        // New camera - create with defaults
        return {
          id: cameraId,
          edgeId: edgeId,
          status: 'active',
          failureCount: 0,
          lastFailure: null,
          disabledReason: null,
          disabledAt: null,
          disabledBy: null,
          lastSuccess: null
        };
      });
    }
    
    // ─────────────────────────────────────────────
    // SYNC SCREENS ARRAY FROM startPoints
    // Keep screens array in sync with startPoints
    // ─────────────────────────────────────────────
    const startPoints = updateData.startPoints || existingFloor.startPoints;
    const nodes = updateData.nodes || existingFloor.nodes;
    if (startPoints && startPoints.length > 0) {
      // Get existing screens to preserve their metadata
      const existingScreens = existingFloor.screens || [];
      const existingScreenMap = {};
      existingScreens.forEach(screen => {
        existingScreenMap[screen.nodeId] = screen;
      });
      
      // Generate updated screens array
      updateData.screens = startPoints.map((nodeId, index) => {
        // Preserve existing screen metadata if screen already exists
        const existing = existingScreenMap[nodeId];
        if (existing) {
          return existing.toObject ? existing.toObject() : existing;
        }
        // New screen - create with defaults
        const node = nodes?.find(n => n.id === nodeId);
        return {
          id: `SCREEN_${index + 1}`,
          nodeId: nodeId,
          name: node?.label ? `${node.label} Display` : `Screen ${index + 1}`,
          status: 'active'
        };
      });
    }

    // ─────────────────────────────────────────────
    // APPLY UPDATES & SAVE
    // Object.assign merges updateData into existing
    // ─────────────────────────────────────────────
    Object.assign(existingFloor, updateData);
    await existingFloor.save();

    return res.status(200).json({
      status: 200,
      data: {
        data: existingFloor,
        message: "Floor updated successfully",
      },
    });
  } catch (err) {
    return res.status(500).json({
      status: 500,
      data: {
        data: null,
        message: err.message,
      },
    });
  }
};

export default updateFloor;