/**
 * @fileoverview Get Records Controller
 * @description Retrieves image/AI processing records with optional date filtering.
 *              Supports historical analysis of hazard detection data.
 * 
 * @route GET /api/records?floorId=xxx&startDate=xxx&endDate=xxx
 * @access Public (read-only data)
 * 
 * @requires ImageRecord - MongoDB model for AI processing results
 * 
 * @module controllers/records/getRecords
 * @author Marcelino Saad
 * @version 1.0.0
 */

import ImageRecord from "../../models/ImageRecord.js";

/**
 * Retrieves image records for a floor with optional date range filtering.
 * 
 * @async
 * @function getRecords
 * @param {import('express').Request} req - Express request object
 * @param {string} req.query.floorId - Floor ID to get records for (required)
 * @param {string} [req.query.startDate] - ISO date string for range start
 * @param {string} [req.query.endDate] - ISO date string for range end
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<Response>} JSON response with records array or error
 * 
 * @description
 * Query parameters:
 * - floorId: Required - which floor's records to retrieve
 * - startDate: Optional - filter records from this date (inclusive)
 * - endDate: Optional - filter records until this date (inclusive)
 * 
 * Results are sorted by timestamp (newest first).
 * 
 * @example
 * // Request: GET /api/records?floorId=floor_1&startDate=2024-01-01&endDate=2024-01-31
 * // Response (200):
 * // {
 * //   status: 200,
 * //   data: {
 * //     data: [{ floorId: 'floor_1', timestamp: '...', ... }, ...],
 * //     recordsCount: 15,
 * //     message: 'Records retrieved successfully'
 * //   }
 * // }
 */
const getRecords = async (req, res) => {
  try {
    const floorId = req.query.floorId;
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
    
    // Pagination parameters with defaults
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20)); // Max 100 per page
    const skip = (page - 1) * limit;

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

    // ─────────────────────────────────────────────
    // BUILD QUERY WITH OPTIONAL DATE FILTERING
    // ─────────────────────────────────────────────
    const query = { floorId };
    
    // Add timestamp range if dates provided
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = startDate; // Greater than or equal
      if (endDate) query.timestamp.$lte = endDate;     // Less than or equal
    }

    // Get total count for pagination info
    const totalCount = await ImageRecord.countDocuments(query);
    
    // Execute query with pagination (newest first)
    const records = await ImageRecord.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    // Return 404 if no records found
    if (!records || records.length === 0) {
      return res.status(404).json({
        status: 404,
        data: {
          data: [],
          recordsCount: 0,
          totalCount: 0,
          page,
          limit,
          totalPages: 0,
          message: "No records found for the specified criteria",
        },
      });
    }
    
    const totalPages = Math.ceil(totalCount / limit);
    
    return res.status(200).json({
      status: 200,
      data: {
        data: records,
        recordsCount: records.length,
        totalCount,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        message: "Records retrieved successfully",
      },
    });
  } catch (err) {
    return res.status(500).json({
      status: 500,
      data: {
        data: null,
        message: "Server error while retrieving records",
      },
    });
  }
};

export default getRecords;