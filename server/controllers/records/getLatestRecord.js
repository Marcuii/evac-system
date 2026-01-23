/**
 * @fileoverview Get Latest Record Controller
 * @description Retrieves the most recent image/AI processing record for a floor.
 *              Used to get current hazard detection status.
 * 
 * @route GET /api/records/latest?floorId=xxx
 * @access Public (read-only data)
 * 
 * @requires ImageRecord - MongoDB model for AI processing results
 * 
 * @module controllers/records/getLatestRecord
 * @author Marcelino Saad
 * @version 1.0.0
 */

import ImageRecord from "../../models/ImageRecord.js";

/**
 * Retrieves the most recent image record for a specific floor.
 * 
 * @async
 * @function getLatestRecord
 * @param {import('express').Request} req - Express request object
 * @param {string} req.query.floorId - Floor ID to get latest record for
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<Response>} JSON response with latest record or error
 * 
 * @description
 * - Returns the single most recent record based on timestamp
 * - Includes AI detection results (hazards, objects, confidence)
 * - Used by screens to check current floor status
 * 
 * @example
 * // Request: GET /api/records/latest?floorId=floor_1
 * // Response (200):
 * // {
 * //   status: 200,
 * //   data: {
 * //     data: { floorId: 'floor_1', hazardDetected: true, ... },
 * //     message: 'Latest record retrieved successfully'
 * //   }
 * // }
 */
const getLatestRecord = async (req, res) => {
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

    // Find most recent record by timestamp (descending)
    const latestRecord = await ImageRecord.findOne({ floorId }).sort({ timestamp: -1 });

    // Return 404 if no records exist for this floor
    if (!latestRecord) {
      return res.status(404).json({
        status: 404,
        data: {
          data: null,
          message: "No records found for the specified floorId",
        },
      });
    }

    return res.status(200).json({
      status: 200,
      data: {
        data: latestRecord,
        message: "Latest record retrieved successfully",
      },
    });
  } catch (err) {
    return res.status(500).json({
      status: 500,
      data: {
        data: null,
        message: "Server error while retrieving the latest record",
      },
    });
  }
};

export default getLatestRecord;