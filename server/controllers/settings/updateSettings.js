/**
 * @fileoverview Update Settings Controller
 * @description Updates system settings in the database.
 * 
 * @route PUT /api/settings
 * @access Admin (requires x-admin-auth header)
 * 
 * @requires Settings - MongoDB model for settings data
 * 
 * @module controllers/settings/updateSettings
 * @author Marcelino Saad
 * @version 1.0.0
 */

import Settings from "../../models/Settings.js";

/**
 * Updates system settings.
 * Supports partial updates - only specified fields are changed.
 * 
 * @async
 * @function updateSettings
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<Response>} JSON response with updated settings or error
 * 
 * @example
 * // Request: PUT /api/settings
 * // Body: {
 * //   cloudSync: { enabled: true, intervalHours: 6 },
 * //   cloudProcessing: { enabled: false, disabledReason: "Network issues" }
 * // }
 * // Response (200):
 * // {
 * //   status: 200,
 * //   data: {
 * //     cloudSync: { enabled: true, intervalHours: 6, ... },
 * //     cloudProcessing: { enabled: false, ... },
 * //     message: "Settings updated successfully"
 * //   }
 * // }
 */
const updateSettings = async (req, res) => {
  try {
    const { cloudSync, cloudProcessing } = req.body;
    
    // Validate input
    if (!cloudSync && !cloudProcessing) {
      return res.status(400).json({
        status: 400,
        data: {
          message: "No settings provided to update. Include 'cloudSync' and/or 'cloudProcessing'."
        }
      });
    }
    
    // Validate cloudSync.intervalHours if provided
    if (cloudSync?.intervalHours !== undefined) {
      const interval = Number(cloudSync.intervalHours);
      if (isNaN(interval) || interval < 1 || interval > 168) {
        return res.status(400).json({
          status: 400,
          data: {
            message: "cloudSync.intervalHours must be a number between 1 and 168 (1 hour to 1 week)"
          }
        });
      }
    }
    
    // Build updates object
    const updates = {};
    if (cloudSync) updates.cloudSync = cloudSync;
    if (cloudProcessing) updates.cloudProcessing = cloudProcessing;
    
    // Update settings
    const settings = await Settings.updateSettings(updates, 'admin');
    
    // Log the change
    console.log(`📋 Settings updated by admin:`, {
      cloudSyncEnabled: settings.cloudSync.enabled,
      cloudSyncInterval: settings.cloudSync.intervalHours,
      cloudProcessingEnabled: settings.cloudProcessing.enabled
    });
    
    return res.status(200).json({
      status: 200,
      data: {
        cloudSync: settings.cloudSync,
        cloudProcessing: settings.cloudProcessing,
        updatedAt: settings.updatedAt,
        updatedBy: settings.updatedBy,
        message: "Settings updated successfully"
      }
    });
  } catch (err) {
    console.error("Error updating settings:", err.message);
    return res.status(500).json({
      status: 500,
      data: {
        data: null,
        message: "Server error while updating settings"
      }
    });
  }
};

export default updateSettings;
