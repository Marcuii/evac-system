/**
 * @fileoverview Get Settings Controller
 * @description Retrieves the current system settings from the database.
 * 
 * @route GET /api/settings
 * @access Admin (requires x-admin-auth header)
 * 
 * @requires Settings - MongoDB model for settings data
 * 
 * @module controllers/settings/getSettings
 * @author Marcelino Saad
 * @version 1.0.0
 */

import Settings from "../../models/Settings.js";

/**
 * Retrieves the current system settings.
 * Creates default settings if they don't exist.
 * 
 * @async
 * @function getSettings
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<Response>} JSON response with settings or error
 * 
 * @example
 * // Request: GET /api/settings
 * // Response (200):
 * // {
 * //   status: 200,
 * //   data: {
 * //     cloudSync: { enabled: true, intervalHours: 12, ... },
 * //     cloudProcessing: { enabled: true, ... },
 * //     updatedAt: "2026-01-23T...",
 * //     updatedBy: "admin"
 * //   }
 * // }
 */
const getSettings = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    
    return res.status(200).json({
      status: 200,
      data: {
        cloudSync: settings.cloudSync,
        cloudProcessing: settings.cloudProcessing,
        updatedAt: settings.updatedAt,
        updatedBy: settings.updatedBy,
        message: "Settings retrieved successfully"
      }
    });
  } catch (err) {
    console.error("Error retrieving settings:", err.message);
    return res.status(500).json({
      status: 500,
      data: {
        data: null,
        message: "Server error while retrieving settings"
      }
    });
  }
};

export default getSettings;
