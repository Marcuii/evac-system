/**
 * @fileoverview Create Floor Controller
 * @description Handles creation of new floor maps with graph data,
 *              camera configurations, and floor plan images.
 * 
 * @route POST /api/floors
 * @access Admin (requires x-admin-auth header)
 * 
 * @requires FloorMap - MongoDB model for floor data
 * @requires uploadFloorImageToCloud - Cloudinary upload utility
 * @requires validateFloorData - Cross-floor uniqueness validator
 * 
 * @module controllers/floors/createFloor
 * @author Marcelino Saad
 * @version 1.0.0
 */

import FloorMap from "../../models/FloorMap.js";
import { uploadFloorImageToCloud } from "../../utils/storage/uploadCloudImage.js";
import { validateFloorData } from "../../utils/validators/floorValidator.js";

/**
 * Creates a new floor map in the database.
 * 
 * @async
 * @function createFloor
 * @param {import('express').Request} req - Express request object
 * @param {Object} req.body - Floor data (may be JSON or form-data)
 * @param {string} req.body.id - Unique floor identifier
 * @param {string} req.body.name - Human-readable floor name
 * @param {Array} req.body.nodes - Graph nodes (JSON or string)
 * @param {Array} req.body.edges - Graph edges (JSON or string)
 * @param {Object} req.body.cameraToEdge - Camera-to-edge mapping
 * @param {Array} req.body.startPoints - Screen locations (node IDs)
 * @param {Array} req.body.exitPoints - Exit node IDs
 * @param {number} [req.body.widthMeters] - Real-world width for scale
 * @param {number} [req.body.heightMeters] - Real-world height for scale
 * @param {Express.Multer.File} req.file - Uploaded floor plan image
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<Response>} JSON response with created floor or error
 * 
 * @description
 * Workflow:
 * 1. Parse JSON fields (multipart/form-data sends as strings)
 * 2. Validate required fields are present
 * 3. Check floor ID doesn't already exist
 * 4. Validate uniqueness across all floors (nodes, edges, cameras)
 * 5. Upload floor plan image to Cloudinary
 * 6. Create floor document with all data
 * 
 * @example
 * // Request (multipart/form-data):
 * // - id: 'floor_1'
 * // - name: 'Ground Floor'
 * // - nodes: '[{"id":"N1","x":100,"y":100}]'
 * // - edges: '[{"id":"E1","from":"N1","to":"N2"}]'
 * // - mapImage: <file>
 * 
 * // Response (201):
 * // { status: 201, data: { data: {...}, message: 'Floor created successfully' } }
 */
const createFloor = async (req, res) => {
  try {
    const floorData = req.body;

    // ─────────────────────────────────────────
    // PARSE JSON FIELDS
    // multipart/form-data sends arrays as strings
    // ─────────────────────────────────────────
    if (typeof floorData.nodes === "string") {
      floorData.nodes = JSON.parse(floorData.nodes);
    }
    if (typeof floorData.edges === "string") {
      floorData.edges = JSON.parse(floorData.edges);
    }
    if (typeof floorData.cameraToEdge === "string") {
      floorData.cameraToEdge = JSON.parse(floorData.cameraToEdge);
    }
    if (typeof floorData.startPoints === "string") {
      floorData.startPoints = JSON.parse(floorData.startPoints);
    }
    if (typeof floorData.exitPoints === "string") {
      floorData.exitPoints = JSON.parse(floorData.exitPoints);
    }
    
    // Parse real-world dimensions for scale calculation
    if (floorData.widthMeters) {
      floorData.widthMeters = parseFloat(floorData.widthMeters);
    }
    if (floorData.heightMeters) {
      floorData.heightMeters = parseFloat(floorData.heightMeters);
    }

    // ─────────────────────────────────────────
    // VALIDATE REQUIRED FIELDS
    // ─────────────────────────────────────────
    if (
      !floorData.id ||
      !floorData.name ||
      !floorData.edges ||
      !floorData.nodes ||
      !floorData.cameraToEdge ||
      !floorData.startPoints ||
      !floorData.exitPoints ||
      !req.file
    ) {
      return res.status(400).json({
        status: 400,
        data: {
          data: null,
          message:
            "Missing required fields: id, name, edges, nodes, cameraToEdge, startPoints, exitPoints, mapImage",
        },
      });
    }

    // ─────────────────────────────────────────
    // CHECK FOR DUPLICATE FLOOR ID
    // ─────────────────────────────────────────
    const existingFloor = await FloorMap.findOne({ id: floorData.id });
    if (existingFloor) {
      return res.status(409).json({
        status: 409,
        data: {
          data: null,
          message: `Floor with ID '${floorData.id}' already exists`,
        },
      });
    }

    // ─────────────────────────────────────────
    // VALIDATE CROSS-FLOOR UNIQUENESS
    // Ensures no duplicate node/edge/camera IDs
    // ─────────────────────────────────────────
    const validation = await validateFloorData(floorData);
    if (!validation.valid) {
      return res.status(400).json({
        status: 400,
        data: {
          data: null,
          message: "Validation failed: " + validation.errors.join("; "),
        },
      });
    }

    // ─────────────────────────────────────────
    // UPLOAD FLOOR PLAN IMAGE
    // ─────────────────────────────────────────
    try {
      const uploadResult = await uploadFloorImageToCloud(
        req.file.path,
        floorData.id
      );

      if (uploadResult) {
        // Store image metadata with scale information
        floorData.mapImage = {
          url: uploadResult.url,
          localUrl: req.file.path,
          cloudinaryId: uploadResult.cloudinaryId,
          widthPixels: uploadResult.width,
          heightPixels: uploadResult.height,
          widthMeters: floorData.widthMeters || null,
          heightMeters: floorData.heightMeters || null
        };
        
        // Log scale for debugging
        if (floorData.widthMeters && floorData.heightMeters) {
          const scaleX = uploadResult.width / floorData.widthMeters;
          const scaleY = uploadResult.height / floorData.heightMeters;
          console.log(`Floor map scale: ${scaleX.toFixed(2)} pixels/meter (X), ${scaleY.toFixed(2)} pixels/meter (Y)`);
        }
      }
    } catch (uploadErr) {
      return res.status(500).json({
        status: 500,
        data: {
          data: null,
          message: "Floor image upload failed",
        },
      });
    }

    // ─────────────────────────────────────────
    // CREATE FLOOR DOCUMENT
    // ─────────────────────────────────────────
    
    // Generate cameras array from cameraToEdge mapping
    // This ensures the new format is always used
    if (floorData.cameraToEdge && Object.keys(floorData.cameraToEdge).length > 0) {
      floorData.cameras = Object.entries(floorData.cameraToEdge).map(([cameraId, edgeId]) => ({
        id: cameraId,
        edgeId: edgeId,
        status: 'active',
        failureCount: 0,
        lastFailure: null,
        disabledReason: null,
        disabledAt: null,
        disabledBy: null,
        lastSuccess: null
      }));
    } else {
      floorData.cameras = [];
    }
    
    // Generate screens array from startPoints
    // startPoints are node IDs where screens are located
    if (floorData.startPoints && floorData.startPoints.length > 0) {
      floorData.screens = floorData.startPoints.map((nodeId, index) => {
        // Find the node to get its label for the screen name
        const node = floorData.nodes?.find(n => n.id === nodeId);
        return {
          id: `SCREEN_${index + 1}`,
          nodeId: nodeId,
          name: node?.label ? `${node.label} Display` : `Screen ${index + 1}`,
          status: 'active'
        };
      });
    } else {
      floorData.screens = [];
    }
    
    const newFloor = new FloorMap(floorData);
    await newFloor.save();

    return res.status(201).json({
      status: 201,
      data: {
        data: newFloor,
        message: "Floor created successfully",
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

export default createFloor;
