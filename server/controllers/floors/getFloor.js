/**
 * @fileoverview Get Single Floor Controller
 * @description Retrieves a specific floor map by its unique ID.
 *              Returns complete floor data including graph, cameras, and screens.
 * 
 * @route GET /api/floors/:id
 * @access Admin (requires x-admin-auth header)
 * 
 * @requires FloorMap - MongoDB model for floor data
 * 
 * @module controllers/floors/getFloor
 * @author Marcelino Saad
 * @version 1.0.0
 */

import FloorMap from "../../models/FloorMap.js";

/**
 * Retrieves a single floor map by ID.
 * 
 * @async
 * @function getFloor
 * @param {import('express').Request} req - Express request object
 * @param {string} req.params.id - Floor ID to retrieve
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<Response>} JSON response with floor data or error
 * 
 * @description
 * - Searches by custom 'id' field (not MongoDB _id)
 * - Includes virtual fields (activeCameras, activeScreens, etc.)
 * - Returns 404 if floor not found
 * 
 * @example
 * // Request: GET /api/floors/floor_1
 * // Response (200):
 * // {
 * //   status: 200,
 * //   data: {
 * //     data: { id: 'floor_1', name: 'Ground Floor', nodes: [...], ... },
 * //     message: 'Floor retrieved successfully'
 * //   }
 * // }
 */
const getFloor = async (req, res) => {
  try {
    const floorId = req.params.id;
    
    // Find floor by custom ID field
    const floor = await FloorMap.findOne({ id: floorId });

    // Return 404 if not found
    if (!floor) {
      return res.status(404).json({
        status: 404,
        data: {
          data: null,
          message: `Floor with ID '${floorId}' not found`,
        },
      });
    }

    // Return floor data (includes virtuals via schema settings)
    return res.status(200).json({
      status: 200,
      data: {
        data: floor,
        message: "Floor retrieved successfully",
      },
    });
  } catch (err) {
    return res.status(500).json({
      status: 500,
      data: {
        data: null,
        message: "Server error while retrieving floor",
      },
    });
  }
};

export default getFloor;