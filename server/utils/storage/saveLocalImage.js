/**
 * @fileoverview Local Image Storage Utility
 * @description Saves captured camera frames to organized local storage.
 *              Uses date-based directory structure for easy retrieval.
 * 
 * @requires fs - File system operations
 * @requires path - Path manipulation
 * 
 * @env LOCAL_STORAGE_DIR - Base directory for local storage (default: ./local_storage)
 * 
 * @module utils/storage/saveLocalImage
 * @author Marcelino Saad
 * @version 1.0.0
 * 
 * @exports saveToLocalStorage - Move temp file to organized storage
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

/* ============================================================
 * PATH RESOLUTION
 * ============================================================ */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ============================================================
 * CONFIGURATION
 * ============================================================ */

/**
 * @constant {string} BASE_STORAGE_PATH
 * @description Base directory for local image storage.
 *              Resolved relative to backend-server root.
 * 
 * Directory structure:
 * local_storage/
 *   └── YYYY/
 *       └── MM/
 *           └── DD/
 *               └── {floorId}/
 *                   └── {cameraId}/
 *                       └── {timestamp}-{floorId}-{cameraId}.jpg
 */
const BASE_STORAGE_PATH = process.env.LOCAL_STORAGE_DIR 
  ? path.resolve(process.env.LOCAL_STORAGE_DIR)
  : path.join(__dirname, "..", "..", "local_storage");

/* ============================================================
 * STORAGE FUNCTION
 * ============================================================ */

/**
 * Moves a temporary captured frame to organized local storage.
 * 
 * @function saveToLocalStorage
 * @param {string} tempPath - Absolute path to temporary file
 * @param {string} floorId - Floor identifier for directory structure
 * @param {string} cameraId - Camera identifier for directory structure
 * @returns {Object} Path information
 * @returns {string} returns.relativePath - Relative path for database storage
 * @returns {string} returns.absolutePath - Absolute path for file operations
 * 
 * @description
 * Storage path format:
 * {year}/{month}/{day}/{floorId}/{cameraId}/{filename}
 * 
 * Example:
 * - Input: /tmp/frames/1705312800000-floor_1-CAM_01.jpg
 * - Output relative: 2024/01/15/floor_1/CAM_01/1705312800000-floor_1-CAM_01.jpg
 * - Output absolute: /app/local_storage/2024/01/15/floor_1/CAM_01/1705312800000-floor_1-CAM_01.jpg
 * 
 * @note Uses fs.renameSync to MOVE file (not copy) for efficiency
 * @note Creates directory structure if it doesn't exist
 */
export const saveToLocalStorage = (tempPath, floorId, cameraId) => {
  const now = new Date();
  
  // Build relative path using date-based hierarchy
  // Format: YYYY/MM/DD/floorId/cameraId
  const relativePath = `${now.getFullYear()}/${(now.getMonth() + 1)
    .toString()
    .padStart(2, "0")}/${now
    .getDate()
    .toString()
    .padStart(2, "0")}/${floorId}/${cameraId}`;
    
  // Create absolute folder path
  const absoluteFolder = path.join(BASE_STORAGE_PATH, relativePath);

  // Ensure directory structure exists
  if (!fs.existsSync(absoluteFolder)) {
    fs.mkdirSync(absoluteFolder, { recursive: true });
  }

  // Extract filename and build destination path
  const filename = path.basename(tempPath);
  const absoluteDest = path.join(absoluteFolder, filename);
  
  // Move file from temp to permanent storage
  fs.renameSync(tempPath, absoluteDest);
  
  // Return both paths:
  // - relativePath for database (portable)
  // - absolutePath for immediate file operations
  return {
    relativePath: `${relativePath}/${filename}`,
    absolutePath: absoluteDest
  };
};
