/**
 * @fileoverview Get All Floors Controller
 * @description Retrieves all floor maps from the database.
 *              Returns array of floors with count metadata.
 * 
 * @route GET /api/floors
 * @access Admin (requires x-admin-auth header)
 * 
 * @requires FloorMap - MongoDB model for floor data
 * 
 * @module controllers/floors/getFloors
 * @author Marcelino Saad
 * @version 1.0.0
 */

import FloorMap from "../../models/FloorMap.js";

/**
 * Retrieves all floor maps from the database.
 * 
 * @async
 * @function getFloors
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<Response>} JSON response with floors array or error
 * 
 * @description
 * - Returns all floors regardless of status (active, disabled, maintenance)
 * - Includes floor count in response for convenience
 * - Each floor includes virtual fields (activeCameras, activeScreens)
 * 
 * @example
 * // Request: GET /api/floors
 * // Response (200):
 * // {
 * //   status: 200,
 * //   data: {
 * //     data: [{ id: 'floor_1', ... }, { id: 'floor_2', ... }],
 * //     floorsCount: 2,
 * //     message: 'Floors retrieved successfully'
 * //   }
 * // }
 */
const getFloors = async (req, res) => {
  try {
    // Retrieve all floors (no filtering)
    const floors = await FloorMap.find();
    
    return res.status(200).json({
      status: 200,
      data: {
        data: floors,
        floorsCount: floors.length,
        message: "Floors retrieved successfully",
      },
    });
  } catch (err) {
    return res.status(500).json({
      status: 500,
      data: {
        data: null,
        message: "Server error while retrieving floors",
      },
    });
  }
};

export default getFloors;