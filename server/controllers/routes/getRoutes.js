/**
 * @fileoverview Get Routes Controller
 * @description Retrieves all computed evacuation routes for a floor.
 *              Supports historical analysis of route computations.
 * 
 * @route GET /api/routes?floorId=xxx
 * @access Public (read-only data)
 * 
 * @requires Route - MongoDB model for computed evacuation routes
 * 
 * @module controllers/routes/getRoutes
 * @author Marcelino Saad
 * @version 1.0.0
 */

import Route from "../../models/Route.js";

/**
 * Retrieves all computed evacuation routes for a specific floor.
 * 
 * @async
 * @function getRoutes
 * @param {import('express').Request} req - Express request object
 * @param {string} req.query.floorId - Floor ID to get routes for
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<Response>} JSON response with routes array or error
 * 
 * @description
 * Returns all historical route computations for a floor.
 * Sorted by computedAt (newest first).
 * 
 * Useful for:
 * - Analyzing route changes over time
 * - Debugging pathfinding behavior
 * - Audit trail of evacuation directions
 * 
 * @example
 * // Request: GET /api/routes?floorId=floor_1
 * // Response (200):
 * // {
 * //   status: 200,
 * //   data: {
 * //     data: [{ floorId: 'floor_1', routes: [...], ... }, ...],
 * //     routesCount: 25,
 * //     message: 'Routes retrieved successfully'
 * //   }
 * // }
 */
const getRoutes = async (req, res) => {
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

    // Find all routes for floor, newest first
    const routes = await Route.find({ floorId }).sort({ computedAt: -1 });

    // Return 404 if no routes computed yet
    if (!routes || routes.length === 0) {
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
        data: routes,
        routesCount: routes.length,
        message: "Routes retrieved successfully",
      },
    });
  } catch (err) {
    return res.status(500).json({
      status: 500,
      data: {
        data: null,
        message: "Server error while retrieving routes",
      },
    });
  }
};

export default getRoutes;