/**
 * @fileoverview Status Controller - Device & Floor Status Management
 * @description Comprehensive admin endpoints for managing operational status
 *              of floors, cameras, and screens in the evacuation system.
 * 
 * @route Various endpoints under /api/floors and /api/system
 * @access Admin (requires x-admin-auth header)
 * 
 * @requires FloorMap - MongoDB model for floor data
 * 
 * @module controllers/floors/statusController
 * @author Marcelino Saad
 * @version 1.0.0
 * 
 * @exports updateFloorStatus - Enable/disable/maintenance floor
 * @exports updateCameraStatus - Enable/disable/maintenance camera
 * @exports updateScreenStatus - Enable/disable/maintenance screen
 * @exports resetFloorCameras - Reset all cameras on a floor
 * @exports resetAllCameras - Reset all cameras system-wide
 * @exports getSystemStatus - Get complete system status overview
 * @exports bulkUpdateStatus - Bulk status updates
 */

import FloorMap from "../../models/FloorMap.js";

/* ============================================================
 * STATUS CONSTANTS
 * Valid status values for each entity type
 * ============================================================ */

/**
 * @constant {string[]} FLOOR_STATUSES
 * @description Valid floor status values
 * - active: Normal operation
 * - disabled: Manually disabled by admin
 * - maintenance: Under maintenance
 */
const FLOOR_STATUSES = ['active', 'disabled', 'maintenance'];

/**
 * @constant {string[]} CAMERA_STATUSES
 * @description Valid camera status values
 * - active: Normal operation
 * - disabled: Manually disabled by admin
 * - maintenance: Under maintenance
 * - error: System-set when camera fails repeatedly
 */
const CAMERA_STATUSES = ['active', 'disabled', 'maintenance', 'error'];

/**
 * @constant {string[]} SCREEN_STATUSES
 * @description Valid screen status values
 * - active: Normal operation
 * - disabled: Manually disabled by admin
 * - maintenance: Under maintenance
 */
const SCREEN_STATUSES = ['active', 'disabled', 'maintenance'];

/* ============================================================
 * FLOOR STATUS MANAGEMENT
 * ============================================================ */

/**
 * Updates the operational status of a floor.
 * 
 * @async
 * @function updateFloorStatus
 * @param {import('express').Request} req - Express request object
 * @param {string} req.params.floorId - Floor ID to update
 * @param {string} req.body.status - New status (active|disabled|maintenance)
 * @param {string} [req.body.reason] - Reason for status change
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<Response>} JSON response with updated status info
 * 
 * @route PUT /api/floors/:floorId/status
 * @access Admin
 * 
 * @description
 * When a floor is disabled:
 * - All cameras and screens on the floor stop processing
 * - Evacuation routes exclude this floor
 * - Timestamps and admin ID are recorded
 */
export const updateFloorStatus = async (req, res) => {
  try {
    const { floorId } = req.params;
    const { status, reason } = req.body;
    const adminId = req.admin?.id || 'admin'; // From auth middleware
    
    // Validate status value
    if (!FLOOR_STATUSES.includes(status)) {
      return res.status(400).json({
        status: 400,
        data: {
          data: null,
          message: `Invalid status. Must be one of: ${FLOOR_STATUSES.join(', ')}`
        }
      });
    }
    
    // Find floor by custom ID
    const floor = await FloorMap.findOne({ id: floorId });
    if (!floor) {
      return res.status(404).json({
        status: 404,
        data: {
          data: null,
          message: 'Floor not found'
        }
      });
    }
    
    // Store previous status for logging
    const previousStatus = floor.status || 'active';
    
    // Update status fields
    floor.status = status;
    floor.disabledReason = status !== 'active' ? (reason || `Set to ${status} by admin`) : null;
    floor.disabledAt = status !== 'active' ? new Date() : null;
    floor.disabledBy = status !== 'active' ? adminId : null;
    
    await floor.save();
    
    console.log(`🏢 Floor ${floor.name} status changed: ${previousStatus} → ${status}`);
    
    return res.status(200).json({
      status: 200,
      data: {
        data: {
          id: floor.id,
          name: floor.name,
          status: floor.status,
          previousStatus,
          disabledReason: floor.disabledReason,
          disabledAt: floor.disabledAt,
          disabledBy: floor.disabledBy
        },
        message: 'Floor status updated successfully'
      }
    });
  } catch (err) {
    console.error('Error updating floor status:', err);
    return res.status(500).json({
      status: 500,
      data: {
        data: null,
        message: err.message
      }
    });
  }
};

/* ============================================================
 * CAMERA STATUS MANAGEMENT
 * ============================================================ */

/**
 * Updates the operational status of a specific camera.
 * 
 * @async
 * @function updateCameraStatus
 * @param {import('express').Request} req - Express request object
 * @param {string} req.params.floorId - Parent floor ID
 * @param {string} req.params.cameraId - Camera ID to update
 * @param {string} req.body.status - New status (active|disabled|maintenance)
 * @param {string} [req.body.reason] - Reason for status change
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<Response>} JSON response with updated camera info
 * 
 * @route PUT /api/floors/:floorId/cameras/:cameraId/status
 * @access Admin
 * 
 * @note Admin cannot set 'error' status - that's system-only
 * @note Re-enabling a camera resets its failure count
 */
export const updateCameraStatus = async (req, res) => {
  try {
    const { floorId, cameraId } = req.params;
    const { status, reason } = req.body;
    const adminId = req.admin?.id || 'admin';
    
    // Allow admin to set any status except 'error' (system-only)
    const allowedStatuses = CAMERA_STATUSES.filter(s => s !== 'error');
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        status: 400,
        data: {
          data: null,
          message: `Invalid status. Must be one of: ${allowedStatuses.join(', ')}`
        }
      });
    }
    
    // Find parent floor
    const floor = await FloorMap.findOne({ id: floorId });
    if (!floor) {
      return res.status(404).json({
        status: 404,
        data: {
          data: null,
          message: 'Floor not found'
        }
      });
    }
    
    // Find camera within floor
    const camera = floor.cameras?.find(c => c.id === cameraId);
    if (!camera) {
      return res.status(404).json({
        status: 404,
        data: {
          data: null,
          message: 'Camera not found'
        }
      });
    }
    
    // Store previous status for logging
    const previousStatus = camera.status || 'active';
    
    // Update camera status fields
    camera.status = status;
    camera.disabledReason = status !== 'active' ? (reason || `Set to ${status} by admin`) : null;
    camera.disabledAt = status !== 'active' ? new Date() : null;
    camera.disabledBy = status !== 'active' ? adminId : null;
    
    // Reset failure count when admin re-enables
    if (status === 'active') {
      camera.failureCount = 0;
    }
    
    await floor.save();
    
    console.log(`📷 Camera ${cameraId} on floor ${floor.name} status changed: ${previousStatus} → ${status}`);
    
    return res.status(200).json({
      status: 200,
      data: {
        data: {
          id: camera.id,
          edgeId: camera.edgeId,
          status: camera.status,
          previousStatus,
          failureCount: camera.failureCount,
          disabledReason: camera.disabledReason,
          disabledAt: camera.disabledAt,
          disabledBy: camera.disabledBy
        },
        message: 'Camera status updated successfully'
      }
    });
  } catch (err) {
    console.error('Error updating camera status:', err);
    return res.status(500).json({
      status: 500,
      data: {
        data: null,
        message: err.message
      }
    });
  }
};

/* ============================================================
 * SCREEN STATUS MANAGEMENT
 * ============================================================ */

/**
 * Updates the operational status of a specific screen.
 * 
 * @async
 * @function updateScreenStatus
 * @param {import('express').Request} req - Express request object
 * @param {string} req.params.floorId - Parent floor ID
 * @param {string} req.params.screenId - Screen ID to update
 * @param {string} req.body.status - New status (active|disabled|maintenance)
 * @param {string} [req.body.reason] - Reason for status change
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<Response>} JSON response with updated screen info
 * 
 * @route PUT /api/floors/:floorId/screens/:screenId/status
 * @access Admin
 * 
 * @description
 * Disabled screens won't receive route updates via Socket.IO
 */
export const updateScreenStatus = async (req, res) => {
  try {
    const { floorId, screenId } = req.params;
    const { status, reason } = req.body;
    const adminId = req.admin?.id || 'admin';
    
    // Validate status value
    if (!SCREEN_STATUSES.includes(status)) {
      return res.status(400).json({
        status: 400,
        data: {
          data: null,
          message: `Invalid status. Must be one of: ${SCREEN_STATUSES.join(', ')}`
        }
      });
    }
    
    // Find parent floor
    const floor = await FloorMap.findOne({ id: floorId });
    if (!floor) {
      return res.status(404).json({
        status: 404,
        data: {
          data: null,
          message: 'Floor not found'
        }
      });
    }
    // Find screen within floor
    const screen = floor.screens?.find(s => s.id === screenId);
    if (!screen) {
      return res.status(404).json({
        status: 404,
        data: {
          data: null,
          message: 'Screen not found'
        }
      });
    }
    
    // Store previous status for logging
    const previousStatus = screen.status || 'active';
    
    // Update screen status fields
    screen.status = status;
    screen.disabledReason = status !== 'active' ? (reason || `Set to ${status} by admin`) : null;
    screen.disabledAt = status !== 'active' ? new Date() : null;
    screen.disabledBy = status !== 'active' ? adminId : null;
    
    await floor.save();
    
    console.log(`🖥️ Screen ${screenId} on floor ${floor.name} status changed: ${previousStatus} → ${status}`);
    
    return res.status(200).json({
      status: 200,
      data: {
        data: {
          id: screen.id,
          nodeId: screen.nodeId,
          name: screen.name,
          status: screen.status,
          previousStatus,
          disabledReason: screen.disabledReason,
          disabledAt: screen.disabledAt,
          disabledBy: screen.disabledBy
        },
        message: 'Screen status updated successfully'
      }
    });
  } catch (err) {
    console.error('Error updating screen status:', err);
    return res.status(500).json({
      status: 500,
      data: {
        data: null,
        message: err.message
      }
    });
  }
};

/* ============================================================
 * CAMERA RESET OPERATIONS
 * ============================================================ */

/**
 * Resets all cameras on a specific floor to active status.
 * 
 * @async
 * @function resetFloorCameras
 * @param {import('express').Request} req - Express request object
 * @param {string} req.params.floorId - Floor ID to reset cameras for
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<Response>} JSON response with reset results
 * 
 * @route POST /api/floors/:floorId/cameras/reset
 * @access Admin
 * 
 * @description
 * Resets all cameras on a floor:
 * - Sets status to 'active'
 * - Clears failure counts
 * - Removes disabled reasons and timestamps
 * - Clears lastFailure timestamps
 */
export const resetFloorCameras = async (req, res) => {
  try {
    const { floorId } = req.params;
    const adminId = req.admin?.id || 'admin';
    
    // Find floor
    const floor = await FloorMap.findOne({ id: floorId });
    if (!floor) {
      return res.status(404).json({
        status: 404,
        data: {
          data: null,
          message: 'Floor not found'
        }
      });
    }
    
    // Check if floor has cameras
    if (!floor.cameras || floor.cameras.length === 0) {
      return res.status(400).json({
        status: 400,
        data: {
          data: null,
          message: 'No cameras on this floor'
        }
      });
    }
    
    // Track reset results for response
    const resetResults = [];
    
    // Reset each camera
    for (const camera of floor.cameras) {
      const previousStatus = camera.status;
      const previousFailures = camera.failureCount || 0;
      
      // Reset all status fields
      camera.status = 'active';
      camera.failureCount = 0;
      camera.disabledReason = null;
      camera.disabledAt = null;
      camera.disabledBy = null;
      camera.lastFailure = null;
      
      resetResults.push({
        id: camera.id,
        previousStatus,
        previousFailures,
        newStatus: 'active'
      });
    }
    
    // Mark array as modified for Mongoose
    floor.markModified('cameras');
    await floor.save();
    
    console.log(`🔄 Reset ${floor.cameras.length} cameras on floor ${floor.name} by ${adminId}`);
    
    return res.status(200).json({
      status: 200,
      data: {
        data: {
          floorId: floor.id,
          floorName: floor.name,
          resetCount: resetResults.length,
          cameras: resetResults
        },
        message: 'Floor cameras reset successfully'
      }
    });
  } catch (err) {
    console.error('Error resetting floor cameras:', err);
    return res.status(500).json({
      status: 500,
      data: {
        data: null,
        message: err.message
      }
    });
  }
};

/**
 * Resets ALL cameras across ALL floors to active status.
 * 
 * @async
 * @function resetAllCameras
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<Response>} JSON response with system-wide reset results
 * 
 * @route POST /api/system/cameras/reset
 * @access Admin
 * 
 * @description
 * System-wide camera reset operation:
 * - Finds all floors that have cameras
 * - Resets every camera to active status
 * - Clears all failure counts and error states
 * - Returns detailed breakdown by floor
 * 
 * @warning Use with caution - affects entire system
 */
export const resetAllCameras = async (req, res) => {
  try {
    const adminId = req.admin?.id || 'admin';
    
    // Find all floors that have at least one camera
    const floors = await FloorMap.find({ 'cameras.0': { $exists: true } });
    
    if (floors.length === 0) {
      return res.status(400).json({
        status: 400,
        data: {
          data: null,
          message: 'No floors with cameras found'
        }
      });
    }
    
    // Track results by floor
    const results = [];
    let totalReset = 0;
    
    // Process each floor
    for (const floor of floors) {
      const floorResult = {
        floorId: floor.id,
        floorName: floor.name,
        camerasReset: []
      };
      
      // Reset each camera that was not already active
      for (const camera of floor.cameras) {
        if (camera.status !== 'active' || camera.failureCount > 0) {
          floorResult.camerasReset.push({
            id: camera.id,
            previousStatus: camera.status,
            previousFailures: camera.failureCount || 0
          });
          totalReset++;
        }
        
        // Reset all status fields
        camera.status = 'active';
        camera.failureCount = 0;
        camera.disabledReason = null;
        camera.disabledAt = null;
        camera.disabledBy = null;
        camera.lastFailure = null;
      }
      
      // Save floor with modified cameras
      floor.markModified('cameras');
      await floor.save();
      
      // Only add to results if cameras were actually reset
      if (floorResult.camerasReset.length > 0) {
        results.push(floorResult);
      }
    }
    
    console.log(`🔄 Reset ${totalReset} cameras across ${floors.length} floors by ${adminId}`);
    
    return res.status(200).json({
      status: 200,
      data: {
        data: {
          totalFloorsProcessed: floors.length,
          totalCamerasReset: totalReset,
          details: results
        },
        message: 'All cameras reset successfully'
      }
    });
  } catch (err) {
    console.error('Error resetting all cameras:', err);
    return res.status(500).json({
      status: 500,
      data: {
        data: null,
        message: err.message
      }
    });
  }
};

/* ============================================================
 * SYSTEM STATUS OVERVIEW
 * ============================================================ */

/**
 * Retrieves comprehensive system status overview.
 * 
 * @async
 * @function getSystemStatus
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<Response>} JSON response with complete status overview
 * 
 * @route GET /api/system/status
 * @access Admin
 * 
 * @description
 * Returns aggregated status information:
 * - Floor counts by status (active/disabled/maintenance)
 * - Camera counts by status (active/disabled/maintenance/error)
 * - Screen counts by status (active/disabled/maintenance)
 * - Per-floor breakdown with problematic items highlighted
 * 
 * @example
 * // Response overview structure:
 * // {
 * //   floors: { total: 3, active: 2, disabled: 1, maintenance: 0 },
 * //   cameras: { total: 10, active: 8, disabled: 1, maintenance: 0, error: 1 },
 * //   screens: { total: 6, active: 5, disabled: 1, maintenance: 0 },
 * //   details: [...]
 * // }
 */
export const getSystemStatus = async (req, res) => {
  try {
    // Retrieve all floors
    const floors = await FloorMap.find();
    
    // Initialize counters
    const overview = {
      floors: {
        total: floors.length,
        active: 0,
        disabled: 0,
        maintenance: 0
      },
      cameras: {
        total: 0,
        active: 0,
        disabled: 0,
        maintenance: 0,
        error: 0
      },
      screens: {
        total: 0,
        active: 0,
        disabled: 0,
        maintenance: 0
      },
      details: []
    };
    
    // Aggregate stats from all floors
    for (const floor of floors) {
      // Floor status count
      const floorStatus = floor.status || 'active';
      overview.floors[floorStatus]++;
      
      // Camera status counts
      const cameras = floor.cameras || [];
      overview.cameras.total += cameras.length;
      cameras.forEach(c => {
        const status = c.status || 'active';
        overview.cameras[status]++;
      });
      
      // Screen status counts
      const screens = floor.screens || [];
      overview.screens.total += screens.length;
      screens.forEach(s => {
        const status = s.status || 'active';
        overview.screens[status]++;
      });
      
      // Add detailed floor breakdown
      overview.details.push({
        floorId: floor.id,
        floorName: floor.name,
        status: floorStatus,
        cameras: {
          total: cameras.length,
          active: cameras.filter(c => c.status === 'active' || !c.status).length,
          // List problematic cameras for quick admin review
          problematic: cameras.filter(c => ['disabled', 'maintenance', 'error'].includes(c.status))
            .map(c => ({ id: c.id, status: c.status, reason: c.disabledReason }))
        },
        screens: {
          total: screens.length,
          active: screens.filter(s => s.status === 'active' || !s.status).length,
          // List problematic screens for quick admin review
          problematic: screens.filter(s => ['disabled', 'maintenance'].includes(s.status))
            .map(s => ({ id: s.id, status: s.status, reason: s.disabledReason }))
        }
      });
    }
    
    res.status(200).json({
      status: 200,
      data: {
        data: overview,
        message: 'System status retrieved successfully'
      }
    });
  } catch (err) {
    console.error('Error getting system status:', err);
    return res.status(500).json({
      status: 500,
      data: {
        data: null,
        message: err.message
      }
    });
  }
};

/* ============================================================
 * BULK STATUS OPERATIONS
 * ============================================================ */

/**
 * Performs bulk status updates on multiple items.
 * 
 * @async
 * @function bulkUpdateStatus
 * @param {import('express').Request} req - Express request object
 * @param {Object[]} req.body.items - Array of items to update
 * @param {string} req.body.items[].type - Item type (floor|camera|screen)
 * @param {string} req.body.items[].floorId - Parent floor ID
 * @param {string} [req.body.items[].itemId] - Item ID (for camera/screen)
 * @param {string} req.body.status - New status to set
 * @param {string} [req.body.reason] - Reason for status change
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<Response>} JSON response with success/failure breakdown
 * 
 * @route POST /api/system/bulk-status
 * @access Admin
 * 
 * @description
 * Enables batch status updates for efficiency:
 * - Processes each item independently
 * - Continues on individual failures
 * - Returns detailed success/failure breakdown
 * 
 * @example
 * // Request body:
 * // {
 * //   items: [
 * //     { type: 'camera', floorId: 'floor_1', itemId: 'CAM_01' },
 * //     { type: 'camera', floorId: 'floor_1', itemId: 'CAM_02' }
 * //   ],
 * //   status: 'maintenance',
 * //   reason: 'Scheduled maintenance'
 * // }
 */
export const bulkUpdateStatus = async (req, res) => {
  try {
    const { items, status, reason } = req.body;
    const adminId = req.admin?.id || 'admin';
    
    // Validate items array
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        status: 400,
        data: {
          data: null,
          message: 'Items array is required'
        }
      });
    }
    
    // Track results
    const results = {
      success: [],
      failed: []
    };
    
    // Process each item independently
    for (const item of items) {
      try {
        const { type, floorId, itemId } = item;
        
        // Find floor
        const floor = await FloorMap.findOne({ id: floorId });
        if (!floor) {
          results.failed.push({ ...item, error: 'Floor not found' });
          continue;
        }
        
        // Handle based on item type
        if (type === 'floor') {
          // Validate floor status
          if (!FLOOR_STATUSES.includes(status)) {
            results.failed.push({ ...item, error: 'Invalid floor status' });
            continue;
          }
          // Update floor status
          floor.status = status;
          floor.disabledReason = status !== 'active' ? reason : null;
          floor.disabledAt = status !== 'active' ? new Date() : null;
          floor.disabledBy = status !== 'active' ? adminId : null;
          
        } else if (type === 'camera') {
          // Find camera
          const camera = floor.cameras?.find(c => c.id === itemId);
          if (!camera) {
            results.failed.push({ ...item, error: 'Camera not found' });
            continue;
          }
          // Update camera status
          camera.status = status;
          camera.disabledReason = status !== 'active' ? reason : null;
          camera.disabledAt = status !== 'active' ? new Date() : null;
          camera.disabledBy = status !== 'active' ? adminId : null;
          if (status === 'active') camera.failureCount = 0;
          
        } else if (type === 'screen') {
          // Find screen
          const screen = floor.screens?.find(s => s.id === itemId);
          if (!screen) {
            results.failed.push({ ...item, error: 'Screen not found' });
            continue;
          }
          // Update screen status
          screen.status = status;
          screen.disabledReason = status !== 'active' ? reason : null;
          screen.disabledAt = status !== 'active' ? new Date() : null;
          screen.disabledBy = status !== 'active' ? adminId : null;
          
        } else {
          results.failed.push({ ...item, error: 'Invalid type' });
          continue;
        }
        
        // Save and track success
        await floor.save();
        results.success.push(item);
      } catch (err) {
        results.failed.push({ ...item, error: err.message });
      }
    }
    
    return res.status(200).json({
      status: 200,
      data: {
        data: {
          totalProcessed: items.length,
          successCount: results.success.length,
          failedCount: results.failed.length,
          results
        },
        message: 'Bulk status update completed'
      }
    });
  } catch (err) {
    console.error('Error in bulk status update:', err);
    return res.status(500).json({
      status: 500,
      data: {
        data: null,
        message: err.message
      }
    });
  }
};
