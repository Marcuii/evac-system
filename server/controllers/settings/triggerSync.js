/**
 * @fileoverview Trigger Cloud Sync Controller
 * @description Manually triggers a cloud sync operation.
 * 
 * @route POST /api/settings/sync
 * @access Admin (requires x-admin-auth header)
 * 
 * @requires ../utils/cloudSync.js - Cloud sync utility
 * 
 * @module controllers/settings/triggerSync
 * @author Marcelino Saad
 * @version 1.0.0
 */

import { syncToCloud } from "../../utils/cloudSync.js";

/**
 * Manually triggers a cloud sync operation.
 * Useful for forcing an immediate sync outside the scheduled interval.
 * 
 * @async
 * @function triggerSync
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<Response>} JSON response with sync result or error
 * 
 * @example
 * // Request: POST /api/settings/sync
 * // Response (200):
 * // {
 * //   status: 200,
 * //   data: {
 * //     success: true,
 * //     duration: 5432,
 * //     totalSynced: 150,
 * //     message: "Cloud sync completed successfully"
 * //   }
 * // }
 */
const triggerSync = async (req, res) => {
  try {
    console.log("📋 Manual cloud sync triggered by admin");
    
    const result = await syncToCloud();
    
    if (result.success) {
      return res.status(200).json({
        status: 200,
        data: {
          success: true,
          duration: result.duration,
          totalSynced: result.totalSynced,
          totalErrors: result.totalErrors,
          collections: result.collections,
          message: "Cloud sync completed successfully"
        }
      });
    } else {
      // Sync was skipped or failed
      return res.status(200).json({
        status: 200,
        data: {
          success: false,
          reason: result.reason || result.error || 'unknown',
          message: result.reason === 'disabled' 
            ? "Cloud sync is disabled in settings"
            : result.reason === 'in_progress'
            ? "A sync is already in progress"
            : `Cloud sync failed: ${result.error || 'unknown error'}`
        }
      });
    }
  } catch (err) {
    console.error("Error triggering cloud sync:", err.message);
    return res.status(500).json({
      status: 500,
      data: {
        success: false,
        message: `Server error while triggering sync: ${err.message}`
      }
    });
  }
};

export default triggerSync;
