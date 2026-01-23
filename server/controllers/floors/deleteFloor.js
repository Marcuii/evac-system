/**
 * @fileoverview Delete Floor Controller
 * @description Handles permanent deletion of floor maps from the database.
 *              Removes floor along with all associated graph data.
 * 
 * @route DELETE /api/floors/:id
 * @access Admin (requires x-admin-auth header)
 * 
 * @requires FloorMap - MongoDB model for floor data
 * 
 * @module controllers/floors/deleteFloor
 * @author Marcelino Saad
 * @version 1.0.0
 */

import FloorMap from "../../models/FloorMap.js";

/**
 * Permanently deletes a floor map from the database.
 * 
 * @async
 * @function deleteFloor
 * @param {import('express').Request} req - Express request object
 * @param {string} req.params.id - Floor ID to delete
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<Response>} JSON response with deleted floor or error
 * 
 * @description
 * - Finds floor by custom ID field (not MongoDB _id)
 * - Returns 404 if floor doesn't exist
 * - Returns deleted floor data for confirmation
 * 
 * @warning This is a destructive operation - data cannot be recovered
 * 
 * @example
 * // Request: DELETE /api/floors/floor_1
 * // Response (200):
 * // { status: 200, data: { data: {...}, message: 'Floor deleted successfully' } }
 */
const deleteFloor = async (req, res) => {
  try {
    const floorId = req.params.id;
    
    // Find and delete in one operation
    const deletedFloor = await FloorMap.findOneAndDelete({ id: floorId });

    // Check if floor existed
    if (!deletedFloor) {
      return res.status(404).json({
        status: 404,
        data: {
          data: null,
          message: `Floor with ID '${floorId}' not found`,
        },
      });
    }

    // Return deleted floor data for confirmation
    return res.status(200).json({
      status: 200,
      data: {
        data: deletedFloor,
        message: "Floor deleted successfully",
      },
    });
  } catch (err) {
    return res.status(500).json({
      status: 500,
      data: {
        data: null,
        message: "Server error while deleting floor",
      },
    });
  }
};

export default deleteFloor;