/**
 * @fileoverview Cloudinary Image Upload Utility
 * @description Uploads images to Cloudinary cloud storage.
 *              Handles both camera frames and floor plan images.
 * 
 * @requires ../config/cloudinary.js - Configured Cloudinary SDK instance
 * 
 * @env CLOUDINARY_FRAMES_FOLDER - Folder for camera frames (default: evacuation_frames)
 * @env CLOUDINARY_FLOOR_MAPS_FOLDER - Folder for floor plans (default: floor_maps)
 * 
 * @module utils/storage/uploadCloudImage
 * @author Marcelino Saad
 * @version 1.0.0
 * 
 * @exports uploadRecordToCloud - Upload camera frame to cloud
 * @exports uploadFloorImageToCloud - Upload floor plan image to cloud
 */

import cloudinary from "../../config/cloudinary.js";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

/* ============================================================
 * CONFIGURATION
 * ============================================================ */

/** @constant {string} FRAMES_FOLDER - Cloudinary folder for camera frames */
const FRAMES_FOLDER = process.env.CLOUDINARY_FRAMES_FOLDER || "evacuation_frames";

/** @constant {string} FLOOR_MAPS_FOLDER - Cloudinary folder for floor plan images */
const FLOOR_MAPS_FOLDER = process.env.CLOUDINARY_FLOOR_MAPS_FOLDER || "floor_maps";

/* ============================================================
 * CAMERA FRAME UPLOAD
 * ============================================================ */

/**
 * Uploads a camera frame to Cloudinary with date-based organization.
 * 
 * @async
 * @function uploadRecordToCloud
 * @param {string} localPath - Absolute path to the image file
 * @param {string} floorId - Floor identifier for folder structure
 * @param {string} cameraId - Camera identifier for folder structure
 * @returns {Promise<string|null>} Cloudinary secure URL or null on failure
 * 
 * @description
 * Cloudinary path format:
 * evacuation_frames/{year}/{month}/{day}/{floorId}/{cameraId}/{filename}
 * 
 * Features:
 * - Date-based folder hierarchy for organization
 * - Secure HTTPS URL returned
 * - Only allows JPG and PNG formats
 * 
 * @note Returns null on failure (graceful degradation)
 */
const uploadRecordToCloud = async (localPath, floorId, cameraId) => {
  try {
    const now = new Date();
    
    // Upload with date-based folder structure
    const res = await cloudinary.uploader.upload(localPath, {
      folder: `${FRAMES_FOLDER}/${now.getFullYear()}/${(now.getMonth() + 1)
        .toString()
        .padStart(2, "0")}/${now
        .getDate()
        .toString()
        .padStart(2, "0")}/${floorId}/${cameraId}`,
      public_id: `${path.basename(localPath)}`,
      allowed_formats: ["jpg", "png"],
    });
    
    return res.secure_url;
  } catch (err) {
    // Log warning but don't throw (allows local-only operation)
    console.warn("Cloud upload failed:", err?.message || err || "Unknown error");
    return null;
  }
};

/* ============================================================
 * FLOOR PLAN IMAGE UPLOAD
 * ============================================================ */

/**
 * Uploads a floor plan image to Cloudinary.
 * 
 * @async
 * @function uploadFloorImageToCloud
 * @param {string} localPath - Absolute path to the image file
 * @param {string} floorId - Floor identifier (used as public_id)
 * @returns {Promise<Object|null>} Upload result or null on failure
 * @returns {string} returns.url - Cloudinary secure URL
 * @returns {string} returns.cloudinaryId - Cloudinary public ID for deletion
 * @returns {number} returns.width - Image width in pixels
 * @returns {number} returns.height - Image height in pixels
 * 
 * @description
 * Cloudinary path format:
 * floor_maps/{floorId}
 * 
 * Features:
 * - Returns image dimensions for scale calculation
 * - Supports JPG, PNG, GIF, and WebP formats
 * - Uses floorId as public_id (overwrites on update)
 * 
 * @note Width/height are critical for real-world distance calculations
 */
const uploadFloorImageToCloud = async (localPath, floorId) => {
  try {
    const result = await cloudinary.uploader.upload(localPath, {
      folder: FLOOR_MAPS_FOLDER,
      public_id: `${floorId}`,
      allowed_formats: ["jpg", "png", "gif", "webp"],
      resource_type: "image",
    });
    
    // Return URL and dimensions for scale calculations
    return {
      url: result.secure_url,
      cloudinaryId: result.public_id,
      width: result.width,
      height: result.height,
    };
  } catch (err) {
    console.error("Floor image upload failed:", err?.message || err);
    return null;
  }
};

export { uploadRecordToCloud, uploadFloorImageToCloud };
