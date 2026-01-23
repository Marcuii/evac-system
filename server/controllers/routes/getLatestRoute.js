/**
 * @fileoverview Get Latest Route Controller
 * @description Retrieves the most recently computed evacuation route for a floor.
 *              Used by screens to display current evacuation directions.
 * 
 * @route GET /api/routes/latest?floorId=xxx
 * @access Public (read-only data)
 * 
 * @requires Route - MongoDB model for computed evacuation routes
 * 
 * @module controllers/routes/getLatestRoute
 * @author Marcelino Saad
 * @version 1.0.0
 */

import Route from "../../models/Route.js";

/**
 * Retrieves the most recently computed evacuation route for a floor.
 * 
 * @async
 * @function getLatestRoute
 * @param {import('express').Request} req - Express request object
 * @param {string} req.query.floorId - Floor ID to get latest route for
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<Response>} JSON response with latest route or error
 * 
 * @description
 * Returns the most recent route based on computedAt timestamp.
 * Route includes:
 * - Per-screen evacuation paths (from startPoint to exit)
 * - Hazard locations to avoid
 * - Edge weights and blocked segments
 * 
 * @note Routes are recomputed when hazards are detected/cleared
 * 
 * @example
 * // Request: GET /api/routes/latest?floorId=floor_1
 * // Response (200):
 * // {
 * //   status: 200,
 * //   data: {
 * //     data: {
 * //       floorId: 'floor_1',
 * //       routes: [{ screenId: 'S1', path: ['N1','N2','N3'], ... }],
 * //       computedAt: '2024-01-15T10:30:00Z'
 * //     },
 * //     message: 'Latest route retrieved successfully'
 * //   }
 * // }
 */
const getLatestRoute = async (req, res) => {
  try {
    const floorId = req.query.floorId;
    
    // Validate required parameter
    if (!floorId) {
      return res.status(400).json({
        status: 400,
        data: {
          data: null,
          message: "Missing required query parameter: floorId",
        },
      });
    }

    // Find most recent route by computedAt timestamp (descending)
    const latestRoute = await Route.findOne({ floorId }).sort({ computedAt: -1 });

    // Return 404 if no routes computed yet
    if (!latestRoute) {
      return res.status(404).json({
        status: 404,
        data: {
          data: null,
          message: "No routes found for the specified floorId",
        },
      });
    }

    return res.status(200).json({
      status: 200,
      data: {
        data: latestRoute,
        message: "Latest route retrieved successfully",
      },
    });
  } catch (err) {
    return res.status(500).json({
      status: 500,
      data: {
        data: null,
        message: "Server error while retrieving the latest route",
      },
    });
  }
};

export default getLatestRoute;